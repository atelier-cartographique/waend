
  var parent = document.getElementById('pick-color');
  var picker = new Picker(parent);
  picker.on_done = function(colour) {

    parent.style.background = colour.rgba().toString();
    parent.innerHTML = colour.hex().toString();
    var rgba = colour.rgba();
    document.getElementById('rgba').value = rgba; 

  }

  document.getElementById('pick-color').onclick = function(e) {

    picker.show();
    e.preventDefault()
  };
