const API_URL = "https://script.google.com/macros/s/AKfycbwS_aUXnWE1zqZfh6_4MWWatqBsa-f5itVRwSZMaO5CugOfQo62w2WIKAu7kPbIDTc/exec";

let imagenes = [];
let indice = 0;
let categoriaSeleccionada = null;

/* ===== CARGAR IMÁGENES ===== */
async function cargarImagenes() {
  try {
    const res = await fetch(`${API_URL}?action=imagenes`);
    imagenes = await res.json();
    mostrarImagen();
  } catch (err) {
    console.error(err);
    document.getElementById("status").innerText =
      "❌ Error cargando imágenes";
  }
}

cargarImagenes();

/* ===== MOSTRAR IMAGEN ===== */
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

  const src = `https://drive.google.com/thumbnail?id=${imagenes[indice].id}&sz=w1600`;

  document.getElementById("status").innerText =
    `Imagen ${indice + 1} de ${imagenes.length}`;

  document.getElementById("vh-image").src = src;
  document.getElementById("zoom-img").src = src;
}

/* ===== SELECCIÓN ===== */
function seleccionarCategoria(cat) {
  categoriaSeleccionada = cat;
  actualizarSeleccion();
}

function actualizarSeleccion() {
  document
    .querySelectorAll(".grade-btn, .invalid-btn")
    .forEach(b => b.classList.remove("selected"));

  if (categoriaSeleccionada !== null) {
    document
      .querySelector(`[data-cat="${categoriaSeleccionada}"]`)
      ?.classList.add("selected");

    document.getElementById("send-btn").disabled = false;
  } else {
    document.getElementById("send-btn").disabled = true;
  }
}

/* ===== ENVIAR CLASIFICACIÓN (SIN JSON) ===== */
async function enviarClasificacion() {
  if (categoriaSeleccionada === null) return;

  document.getElementById("send-btn").disabled = true;

  try {
    await fetch(API_URL, {
      method: "POST",
      body: new URLSearchParams({
        imageId: imagenes[indice].id,
        categoria: categoriaSeleccionada
      })
    });

    indice++;
    mostrarImagen();

  } catch (err) {
    console.error(err);
    document.getElementById("status").innerText =
      "❌ Error al guardar";
    document.getElementById("send-btn").disabled = false;
  }
}

/* ===== ZOOM ===== */
function abrirZoom() {
  document.getElementById("zoom").style.display = "flex";
}

function cerrarZoom() {
  document.getElementById("zoom").style.display = "none";
}




