function updateImg() {
  const imgInput = document.getElementById("img_url");
  const productImg = document.getElementById("productImg");

  // Check if input value is a valid URL?
  //  true -> show image of the input URL : false -> show image of original URL
  const imgUrl = imgInput.value.trim();
  /^(http|https):\/\/[^ "]+$/.test(imgUrl)
    ? (productImg.src = imgUrl)
    : (productImg.src = "<%= product.img_url %>");
}
