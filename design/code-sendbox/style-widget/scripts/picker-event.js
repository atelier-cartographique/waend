  var parent = document.getElementById('pick-color');
  var picker = new Picker(parent);
  picker.on_done = function(colour) {

    parent.style.backgroundColor = colour.rgba().toString();
    parent.style.backgroundImage = 'url(pictos/damier.jpg)';
    parent.innerHTML = colour.hex().toString();
    var rgba = colour.rgba();
    document.getElementById('strokeStyle').value = rgba; 

  }

  document.getElementById('pick-color').onclick = function(e) {

    picker.show();
    e.preventDefault()
  };