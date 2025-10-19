// app.js
document.querySelector('form')?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const fileInput = document.querySelector('input[type="file"]');
  const color = document.querySelector('#color').value;
  const notes = document.querySelector('#notes').value;

  if (!fileInput.files.length) {
    alert("Please upload an image first!");
    return;
  }

  const file = fileInput.files[0];
  const reader = new FileReader();

  reader.onloadend = async () => {
    const base64Image = reader.result.split(',')[1]; // Convert image to base64

    const payload = {
      image: base64Image,
      color,
      notes
    };

    try {
      const res = await fetch('/.netlify/functions/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      const resultContainer = document.getElementById('result');

      if (data.image) {
        resultContainer.innerHTML = `<img src="${data.image}" alt="Generated pergola" />`;
      } else {
        resultContainer.innerHTML = `<p>Error: ${data.error || 'No image returned'}</p>`;
      }
    } catch (err) {
      console.error(err);
      alert('Something went wrong while generating your pergola.');
    }
  };

  reader.readAsDataURL(file);
});
