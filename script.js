const API_URL = "PEGA_AQUI_LA_URL_DEL_DEPLOY_DE_APPS_SCRIPT";

let imagenes = [];
let indice = 0;
let categoriaSeleccionada = null;

/* ===== CARGAR IMÁGENES ===== */
fetch(`${API_URL}?action=imagenes`)
  .then(res => res.json())
  .then(data => {
    imagenes = data;
    mostrarImagen();
  })
  .catch(err => {
    document.getElementById("status").innerText =
      "Error cargando imágenes";
    console.error(err);
  });

function mostrarImagen() {
  categoriaSeleccionada = null;
  actualizarSeleccion();

  if (indice >= imagenes.length) {
    document.getElementById("status").innerText =
      "✔ Clasificación finalizada";
    document.getElementById("vh-image").style.display = "none";
    document.getElementById("send-btn").style.display = "none";
    return;
  }

  const src =
    `https://drive.google.com/thumbnail?id=${imagenes[indice].id}&sz=w1600`;

  document.getElementById("status").innerText =
    `Imagen ${indice + 1} de ${imagenes.length}`;

  document.getElementById("vh-image").src = src;
  document.getElementById("zoom-img").src = src;
}

function seleccionarCategoria(cat) {
  categoriaSeleccionada = cat;
  actualizarSeleccion();
}

function actualizarSeleccion() {
  document
    .querySelectorAll(".grade-btn, .invalid-btn")
    .forEach(b => b.classList.remove("selected"));

  if (categoriaSeleccionada !== null) {
    const btn = document.querySelector(
      `[data-cat="${categoriaSeleccionada}"]`
    );
    if (btn) btn.classList.add("selected");
    document.getElementById("send-btn").disabled = false;
  } else {
    document.getElementById("send-btn").disabled = true;
  }
}

function enviarClasificacion() {
  if (categoriaSeleccionada === null) return;

  fetch(API_URL, {
    method: "POST",
    body: JSON.stringify({
      imageId: imagenes[indice].id,
      categoria: categoriaSeleccionada
    })
  });

  indice++;
  mostrarImagen();
}

/* ===== ZOOM ===== */
function abrirZoom() {
  document.getElementById("zoom").style.display = "flex";
}

function cerrarZoom() {
  document.getElementById("zoom").style.display = "none";
}