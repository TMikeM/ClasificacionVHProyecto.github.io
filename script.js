const API_URL = "https://script.google.com/macros/s/AKfycby_dG6BRORU90xfkU3tWroo-thYPtcSj23aper0_YohyZBMCiRZgc8vTpI07w9ZiGk/exec";

let imagenes = [];
let indice = 0;
let categoriaSeleccionada = null;

/* ===== CARGAR IMÁGENES ===== */
async function cargarImagenes() {
  try {
    const res = await fetch(`${API_URL}?action=imagenes`, {
      method: "GET",
      mode: "cors"
    });

    if (!res.ok) throw new Error("Error HTTP: " + res.status);

    const data = await res.json();

    if (!Array.isArray(data)) {
      throw new Error("Respuesta inválida del servidor");
    }

    imagenes = data;
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

  const src =
    `https://drive.google.com/thumbnail?id=${imagenes[indice].id}&sz=w1600`;

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
    const btn = document.querySelector(
      `[data-cat="${categoriaSeleccionada}"]`
    );
    if (btn) btn.classList.add("selected");
    document.getElementById("send-btn").disabled = false;
  } else {
    document.getElementById("send-btn").disabled = true;
  }
}

/* ===== ENVIAR CLASIFICACIÓN ===== */
async function enviarClasificacion() {
  if (categoriaSeleccionada === null) return;

  document.getElementById("send-btn").disabled = true;

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      mode: "cors",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        imageId: imagenes[indice].id,
        categoria: categoriaSeleccionada
      })
    });

    if (!res.ok) throw new Error("Error al guardar");

    await res.json().catch(() => {});

    indice++;
    mostrarImagen();

  } catch (err) {
    console.error(err);
    document.getElementById("status").innerText =
      "❌ Error al guardar clasificación";
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

