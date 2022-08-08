const loginPage = window.electronAPI.baseURL + "/app#/login";
// const loginPage = "https://localhost:8080";

const loadPage = () => {
  window.location.href = loginPage;
};

document.addEventListener("securitypolicyviolation", (e) => {
  e.preventDefault();
  console.log("blockedURI:", e.blockedURI);
  console.log("violatedDirective", e.violatedDirective);
  console.log("originalPolicy", e.originalPolicy);
});

// Si entramos a la app de escritorio dejamos escrito que ya la tenemos cacheada => podremos entrar de manera totalmente offline
// FIXME: when entering the login page we don't really have the web cached. We should set the cached to true only
// when we enter the main page
console.log("Loading ✨");

window.onload = () => {
  if (localStorage.getItem("cached")) {
    console.log("Cached ✨");
    loadPage();
  } else {
    console.log("Not cached ✨");
    fetch(loginPage)
      .then(() => {
        console.log("fsadiohfo");
        localStorage.setItem("cached", "true");
        loadPage();
      })
      .catch((err) => {
        console.log("Error fetching", err);
        console.info("Mostramos offline");
        document.getElementById("offline")!.style.display = "block";
      });
  }
};
