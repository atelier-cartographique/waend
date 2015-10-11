function checkPass(){ 
    var pass1 =  document.getElementById('inputPassword');
    var pass2 =  document.getElementById('inputPassword2');
    var message = document.getElementById('confirmMessage');

    if(pass1.value != pass2.value) {
        console.log('NOO !');
        message.innerHTML="Password does not match."
    }

    else {
        console.log('yes !!!');
        message.innerHTML="Password match !"
    }
};