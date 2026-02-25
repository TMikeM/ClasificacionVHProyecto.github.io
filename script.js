const API_URL = "https://script.google.com/macros/s/AKfycbwGgiQGe6tpDq0JNexrAr4M6EsoGV0__3C6TEp55G17UKMNcPHsNx5IP_dbLDdxyh8x/exec";

// ====== ESTADO ======
let imagenes = [];
let indiceActual = 0;
let categoriaSeleccionada = null;
let enviando = false;

// ====== INIT ======
document.addEventListener("DOMContentLoaded", () => {
  cargarImagenes();
  document.addEventListener("keydown", manejarTeclado);
});

// ====== CARGAR IMÁGENES ======
async function cargarImagenes() {
  setStatus("Cargando imágenes…");
  try {
    const res = await fetch(`${API_URL}?action=imagenes`);
    imagenes = await res.json();
    if (!imagenes.length) {
      setStatus("✓ No hay imágenes pendientes.");
      ocultarViewer();
      return;
    }
    indiceActual = 0;
    renderDots();
    mostrarImagen(indiceActual);
  } catch (err) {
    setStatus("❌ Error al cargar imágenes: " + err.message);
  }
}

// ====== MOSTRAR IMAGEN ======
function mostrarImagen(idx) {
  const img = document.getElementById("vh-image");
  const zoomImg = document.getElementById("zoom-img");

  img.style.opacity = "0";

  setTimeout(() => {
    const archivo = imagenes[idx];
    const src = `https://drive.google.com/thumbnail?id=${archivo.id}&sz=w1600`;
    img.src = src;
    zoomImg.src = src;
    img.onload = () => { img.style.opacity = "1"; };

    setStatus(archivo.name);
    document.getElementById("counter").textContent = `${idx + 1} / ${imagenes.length}`;

    document.getElementById("btn-prev").disabled = idx === 0;
    document.getElementById("btn-next").disabled = idx === imagenes.length - 1;

    actualizarDotActivo(idx);
    resetSeleccion();
  }, 150);
}

// ====== NAVEGACIÓN ======
function navegarImagen(delta) {
  const nuevo = indiceActual + delta;
  if (nuevo < 0 || nuevo >= imagenes.length) return;
  indiceActual = nuevo;
  mostrarImagen(indiceActual);
}

function manejarTeclado(e) {
  if (e.key === "ArrowLeft")  navegarImagen(-1);
  if (e.key === "ArrowRight") navegarImagen(1);
  if (e.key === "Escape")     cerrarZoom();
}

// ====== DOTS ======
function renderDots() {
  const bar = document.getElementById("dots-bar");
  bar.innerHTML = "";
  const max = Math.min(imagenes.length, 20);
  for (let i = 0; i < max; i++) {
    const d = document.createElement("span");
    d.className = "dot" + (i === 0 ? " active" : "");
    d.dataset.idx = i;
    d.onclick = () => { indiceActual = i; mostrarImagen(i); };
    bar.appendChild(d);
  }
}

function actualizarDotActivo(idx) {
  document.querySelectorAll(".dot").forEach(d => {
    d.classList.toggle("active", parseInt(d.dataset.idx) === idx);
  });
}

// ====== SELECCIONAR CATEGORÍA ======
function seleccionarCategoria(cat) {
  categoriaSeleccionada = cat;
  document.querySelectorAll(".grade-btn, .invalid-btn").forEach(b => {
    b.classList.toggle("selected", b.dataset.cat == cat);
  });
  document.getElementById("send-btn").disabled = false;
}

function resetSeleccion() {
  categoriaSeleccionada = null;
  document.querySelectorAll(".grade-btn, .invalid-btn").forEach(b =>
    b.classList.remove("selected")
  );
  document.getElementById("send-btn").disabled = true;
}

// ====== ENVIAR ======
async function enviarClasificacion() {
  if (!categoriaSeleccionada || enviando) return;
  const archivo = imagenes[indiceActual];

  enviando = true;
  const btn = document.getElementById("send-btn");
  btn.innerHTML = "Enviando…";
  btn.disabled = true;

  try {
    await fetch(API_URL, {
      method: "POST",
      body: new URLSearchParams({
        imageId: archivo.id,
        categoria: categoriaSeleccionada
      })
    });

    showToast(`✓ Clasificado como ${etiquetaCategoria(categoriaSeleccionada)}`, "success");
    imagenes.splice(indiceActual, 1);

    if (!imagenes.length) {
      setStatus("✓ Todas las imágenes clasificadas.");
      ocultarViewer();
      return;
    }

    if (indiceActual >= imagenes.length) indiceActual = imagenes.length - 1;
    renderDots();
    mostrarImagen(indiceActual);

  } catch (err) {
    showToast("❌ Error al guardar: " + err.message, "error");
    btn.disabled = false;
  } finally {
    enviando = false;
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> Confirmar clasificación`;
  }
}

// ====== HELPERS ======
function setStatus(msg) {
  document.getElementById("status").textContent = msg;
}

function ocultarViewer() {
  document.querySelector(".viewer-wrapper").style.opacity = "0.3";
  document.querySelector(".buttons").style.pointerEvents = "none";
  document.getElementById("dots-bar").innerHTML = "";
  document.getElementById("counter").textContent = "";
  document.getElementById("btn-prev").disabled = true;
  document.getElementById("btn-next").disabled = true;
  document.getElementById("send-btn").style.display = "none";
}

function etiquetaCategoria(cat) {
  const labels = { "1": "Grado 1", "2": "Grado 2", "3": "Grado 3", "4": "Grado 4", "nofuncional": "No evaluable" };
  return labels[cat] || cat;
}

function showToast(msg, type = "") {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.className = "toast show " + type;
  setTimeout(() => { t.className = "toast"; }, 3500);
}

// ====== ZOOM ======
function abrirZoom() {
  document.getElementById("zoom").style.display = "flex";
}

function cerrarZoom() {
  document.getElementById("zoom").style.display = "none";
}



