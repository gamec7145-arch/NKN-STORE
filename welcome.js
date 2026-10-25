// NKN STORE — Welcome Page
document.addEventListener("DOMContentLoaded", () => {
  const openButton = document.querySelector("#welcomePage button, .welcome-open");

  if (openButton) {
    openButton.addEventListener("click", () => {
      document.body.classList.remove("welcome-mode");
      const welcome = document.getElementById("welcomePage");
      if (welcome) welcome.style.display = "none";
    });
  }
});
