// console.log("yo man");
// let localP = document.getElementById("localP");
// chrome.storage.local.get(["key"], function (result) {
//   console.log("Value currently is " + result.key);
//   localP.innerText = "yo";
// });
$(document).ready(function () {
  $("#button").click(function () {
    var toAdd = $("input[name=ListItem]").val();

    $("ol").append("<li>" + toAdd + "</li>");
  });

  $("input[name=ListItem]").keyup(function (event) {
    if (event.keyCode == 13) {
      $("#button").click();
    }
  });

  $(document).on("dblclick", "li", function () {
    $(this).toggleClass("strike").fadeOut("slow");
  });

  $("input").focus(function () {
    $(this).val("");
  });

  $("ol").sortable();
});
window.onload = function () {
  var nameInput = document.getElementById("name");

  document
    .querySelector("form.pure-form")
    .addEventListener("submit", function (e) {
      //prevent the normal submission of the form
      e.preventDefault();

      console.log(nameInput.value);
    });
  let localP = document.getElementById("localP");

  let btn = document.getElementById("btn");
  console.log({ btn });
  btn.addEventListener("click", myFunction);
  function myFunction() {
    console.log("presssssed");
    // document.getElementById("localP").innerHTML = "Hello World";
    chrome.storage.local.get(["key"], function (result) {
      console.log("Value currently is " + result.key);
      localP.innerText = result.key;
    });
  }
};
