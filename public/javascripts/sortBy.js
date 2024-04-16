const sortByOptions = document.querySelectorAll(".sort-by-list li");
const productList = document.querySelector(".product-list");

sortByOptions.forEach((option) => {
  option.addEventListener("click", () => {
    switch (option.getAttribute("name")) {
      case "sort-by-price-low-to-high":
        products = products.slice().sort((a, b) => a.price - b.price);
        break;
      case "sort-by-price-high-to-low":
        products = products.slice().sort((a, b) => b.price - a.price);
        break;
    }
  });
});
