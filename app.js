const fileEl = document.getElementById('file');
const previewImg = document.getElementById('preview');
const resultImg = document.getElementById('result');
const statusEl = document.getElementById('status');
const colorEl = document.getElementById('color');
const promptEl = document.getElementById('prompt');
const goBtn = document.getElementById('go');
const dlA = document.getElementById('download');

let imageDataUrl = null;

fileEl.addEventListener('change', async () => {
  const f = fileEl.files[0];
  if (!f) return;
  imageDataUrl = await readAndMaybeResize(f, 1920, 1920, 0.9);
  previewImg.src = imageDataUrl;
  previewImg.style.display = 'block';
  goBtn.disabled = false;
  status('Ready. Click "Generate my design".');
});

goBtn.addEventListener('click', async () => {
  if (!imageDataUrl) return;
  goBtn.disabled = true;
  status('Uploading and generating…');

  const body = {
    imageBase64: imageDataUrl,
    filename: (fileEl.files[0] && fileEl.files[0].name) || 'upload.jpg',
    color: colorEl.value,
    prompt: promptEl.value || ''
  };

  try {
    const res = await fetch('/.netlify/functions/generate', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Unknown error');
    if (data.image) {
      resultImg.src = data.image;
      resultImg.style.display = 'block';
      dlA.href = data.image;
      dlA.style.display = 'inline-block';
      status('Done ✅');
    } else {
      throw new Error('No image returned');
    }
  } catch (err) {
    console.error(err);
    status('Error: ' + err.message);
  } finally {
    goBtn.disabled = false;
  }
});

function status(msg){ statusEl.textContent = msg; }

function readAndMaybeResize(file, maxW, maxH, quality=0.92){
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let w = img.width, h = img.height;
        let scale = Math.min(maxW/w, maxH/h, 1);
        if (scale < 1){
          const c = document.createElement('canvas');
          c.width = Math.round(w*scale); c.height = Math.round(h*scale);
          const ctx = c.getContext('2d');
          ctx.drawImage(img, 0, 0, c.width, c.height);
          resolve(c.toDataURL('image/jpeg', quality));
        } else {
          resolve(reader.result);
        }
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
