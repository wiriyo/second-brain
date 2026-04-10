function addParaItem(section) {
  const input = document.getElementById('input-' + section);
  input.style.display = input.style.display === 'none' ? 'block' : 'none';
  if (input.style.display === 'block') input.focus();
}

function saveParaItem(section) {
  const input = document.getElementById('input-' + section);
  const text = input.value.trim();
  if (!text) { input.style.display = 'none'; return; }
  const list = document.getElementById('list-' + section);
  const item = document.createElement('div');
  item.className = 'para-item';
  item.innerHTML = `<span class="para-item-dot"></span><span class="para-item-text">${text}</span>
    <button class="item-btn" onclick="this.closest('.para-item').remove()" style="margin-left:auto">✕</button>`;
  list.appendChild(item);
  input.value = ''; input.style.display = 'none';
}
