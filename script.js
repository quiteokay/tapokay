document.getElementById('ok-button').addEventListener('click', function() {
    this.style.display = 'none'; // Hide the button
    const container = document.querySelector('.container');
    
    // Add the new text and image
    const message = document.createElement('div');
    message.textContent = 'Here we go!';
    message.style.fontSize = '32px';
    message.style.color = '#333';
    message.style.marginBottom = '20px';
    container.appendChild(message);

    const image = document.createElement('img');
    image.src = 'https://example.com/frog-rocket.jpg'; // Replace with the actual image URL
    image.alt = 'Frog riding a rocket';
    image.style.display = 'block';
    container.appendChild(image);
});