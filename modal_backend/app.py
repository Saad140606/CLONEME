import base64
import os
import subprocess
import tempfile
from pathlib import Path

import modal
import requests

app = modal.App("cloneme")

_face_app = None
_swapper = None
_reference_face_cache = {}


def update_job_status(job_id: str, status: str, result_url: str | None = None) -> None:
    supabase_url = os.environ["SUPABASE_URL"]
    supabase_key = os.environ["SUPABASE_SERVICE_KEY"]

    payload = {
        "status": status,
        "updated_at": "now",
    }

    if result_url is not None:
      payload["result_url"] = result_url

    response = requests.patch(
        f"{supabase_url}/rest/v1/jobs?id=eq.{job_id}",
        headers={
            "Authorization": f"Bearer {supabase_key}",
            "apikey": supabase_key,
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        },
        json=payload,
        timeout=30,
    )
    response.raise_for_status()

base_image = (
    modal.Image.debian_slim(python_version="3.10")
    .apt_install("git", "ffmpeg", "libgl1-mesa-glx", "libglib2.0-0")
    .pip_install(
        "torch==2.1.0",
        "torchvision==0.16.0",
        "transformers",
        "accelerate",
        "omegaconf",
        "einops",
        "imageio",
        "imageio-ffmpeg",
        "opencv-python-headless",
        "numpy",
        "xformers",
        "insightface",
        "onnxruntime-gpu",
        "huggingface_hub",
        "requests",
        "diffusers",
        "fastapi[standard]",
    )
    .run_commands("git clone https://github.com/tencent/MimicMotion.git /app/MimicMotion")
)


@app.function(
    gpu="T4",
    image=base_image,
    timeout=600,
    memory=16384,
    secrets=[modal.Secret.from_name("cloneme-secrets")],
)
def run_upload_inference(item: dict):
    job_id = item["job_id"]
    photo_url = item["photo_url"]
    video_url = item["video_url"]
    webhook_url = item["webhook_url"]

    try:
        tmpdir = Path(tempfile.mkdtemp())
        photo_path = tmpdir / "reference.jpg"
        video_path = tmpdir / "driving.mp4"
        output_path = tmpdir / "output.mp4"

        photo_resp = requests.get(photo_url, timeout=60)
        photo_resp.raise_for_status()
        photo_path.write_bytes(photo_resp.content)

        video_resp = requests.get(video_url, timeout=120)
        video_resp.raise_for_status()
        video_path.write_bytes(video_resp.content)

        subprocess.run(
            [
                "python",
                "/app/MimicMotion/inference.py",
                "--reference-image",
                str(photo_path),
                "--motion-video",
                str(video_path),
                "--output",
                str(output_path),
            ],
            check=True,
            cwd="/app/MimicMotion",
        )

        supabase_url = os.environ["SUPABASE_URL"]
        supabase_key = os.environ["SUPABASE_SERVICE_KEY"]

        upload_resp = requests.post(
            f"{supabase_url}/storage/v1/object/results/{job_id}.mp4",
            headers={
                "Authorization": f"Bearer {supabase_key}",
                "Content-Type": "video/mp4",
            },
            data=output_path.read_bytes(),
            timeout=180,
        )
        upload_resp.raise_for_status()

        result_url = f"{supabase_url}/storage/v1/object/public/results/{job_id}.mp4"
        update_job_status(job_id, "done", result_url)
        requests.post(webhook_url, json={"job_id": job_id, "result_url": result_url}, timeout=30)
    except Exception as error:
        try:
            update_job_status(job_id, "failed")
        except Exception:
            pass
        requests.post(webhook_url, json={"job_id": job_id, "error": str(error)}, timeout=30)

    return {"ok": True}


@app.function(image=base_image, timeout=60, secrets=[modal.Secret.from_name("cloneme-secrets")])
@modal.fastapi_endpoint(method="POST")
def generate(item: dict):
    # Return immediately while heavy upload-mode inference runs on a GPU worker.
    run_upload_inference.spawn(item)
    return {"queued": True}


@app.function(
    gpu="T4",
    image=base_image,
    timeout=30,
    memory=16384,
    min_containers=1,
)
@modal.fastapi_endpoint(method="POST")
def live_frame(item: dict):
    import cv2
    import numpy as np
    from insightface.app import FaceAnalysis
    from insightface.model_zoo import get_model

    global _face_app, _swapper, _reference_face_cache

    frame_b64 = item.get("frame_b64")
    reference_url = item.get("reference_url")
    if not frame_b64 or not reference_url:
        raise ValueError("Missing frame_b64 or reference_url")

    if _face_app is None:
        _face_app = FaceAnalysis(name="buffalo_l")
        _face_app.prepare(ctx_id=0, det_size=(640, 640))

    if _swapper is None:
        _swapper = get_model("inswapper_128.onnx", download=True, download_zip=True)

    frame_bytes = base64.b64decode(frame_b64)
    frame_arr = np.frombuffer(frame_bytes, np.uint8)
    frame = cv2.imdecode(frame_arr, cv2.IMREAD_COLOR)
    if frame is None:
        raise ValueError("Failed to decode input frame")

    ref_face = _reference_face_cache.get(reference_url)
    if ref_face is None:
        ref_resp = requests.get(reference_url, timeout=30)
        ref_resp.raise_for_status()
        ref_arr = np.frombuffer(ref_resp.content, np.uint8)
        ref_img = cv2.imdecode(ref_arr, cv2.IMREAD_COLOR)
        if ref_img is None:
            raise ValueError("Failed to decode reference image")

        ref_faces = _face_app.get(ref_img)
        if not ref_faces:
            _, encoded = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
            return {"frame_b64": base64.b64encode(encoded.tobytes()).decode()}

        ref_face = ref_faces[0]
        _reference_face_cache[reference_url] = ref_face

    for detected_face in _face_app.get(frame):
        frame = _swapper.get(frame, detected_face, ref_face, paste_back=True)

    _, encoded = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
    return {"frame_b64": base64.b64encode(encoded.tobytes()).decode()}
