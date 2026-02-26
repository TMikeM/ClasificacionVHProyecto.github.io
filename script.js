const API_URL = "https://script.google.com/macros/s/AKfycbytQPqbrbHjH81f-pUHkLredDKJgSbtv1J-l0I45a0V5x4DDoDZTuf57bh07RVeirfo/exec";

// ====== ESTADO ======
let imagenes = [];
let indiceActual = 0;
let selecciones = {};
let enviando = false;

const DOTS_VISIBLES = 9; // cuántos puntos se muestran a la vez

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

    actualizarDots(idx);

    const selGuardada = selecciones[archivo.id] ?? null;
    restaurarSeleccion(selGuardada);
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
  if (e.target.tagName === "INPUT") return;
  if (e.key === "ArrowLeft")  navegarImagen(-1);
  if (e.key === "ArrowRight") navegarImagen(1);
  if (e.key === "Escape")     cerrarZoom();
}

// ====== DOTS — ventana deslizante ======
function renderDots() {
  const bar = document.getElementById("dots-bar");
  bar.innerHTML = "";

  const total = imagenes.length;
  if (total <= 1) return; // con 1 imagen no tiene sentido mostrar dots

  // Cuántos dots crear: si hay menos que DOTS_VISIBLES, todos; si no, DOTS_VISIBLES
  const cantidad = Math.min(total, DOTS_VISIBLES);
  for (let i = 0; i < cantidad; i++) {
    const d = document.createElement("span");
    d.className = "dot";
    bar.appendChild(d);
  }

  actualizarDots(indiceActual);
}

function actualizarDots(idx) {
  const bar = document.getElementById("dots-bar");
  const dotEls = bar.querySelectorAll(".dot");
  if (!dotEls.length) return;

  const total = imagenes.length;
  const cantidad = dotEls.length;

  // Calcular ventana: qué rango de índices reales representan los dots visibles
  let inicio = idx - Math.floor(cantidad / 2);
  inicio = Math.max(0, inicio);
  inicio = Math.min(inicio, total - cantidad);

  dotEls.forEach((d, i) => {
    const realIdx = inicio + i;

    // Quitar eventos anteriores clonando el nodo
    const nuevo = d.cloneNode(true);
    d.parentNode.replaceChild(nuevo, d);

    nuevo.classList.toggle("active", realIdx === idx);

    // Tamaño contextual: más pequeños en los extremos si hay overflow
    nuevo.classList.remove("dot-sm", "dot-xs");
    if (total > cantidad) {
      if (i === 0 && inicio > 0) nuevo.classList.add("dot-xs");
      else if (i === 1 && inicio > 0) nuevo.classList.add("dot-sm");
      else if (i === cantidad - 1 && inicio + cantidad < total) nuevo.classList.add("dot-xs");
      else if (i === cantidad - 2 && inicio + cantidad < total) nuevo.classList.add("dot-sm");
    }

    nuevo.onclick = () => { indiceActual = realIdx; mostrarImagen(realIdx); };
    nuevo.title = `Imagen ${realIdx + 1}`;
  });
}

// ====== SELECCIONAR CATEGORÍA ======
function seleccionarCategoria(cat) {
  const archivo = imagenes[indiceActual];
  selecciones[archivo.id] = cat;

  document.querySelectorAll(".grade-btn, .invalid-btn").forEach(b => {
    b.classList.toggle("selected", b.dataset.cat == cat);
  });
  document.getElementById("send-btn").disabled = false;
}

function restaurarSeleccion(cat) {
  document.querySelectorAll(".grade-btn, .invalid-btn").forEach(b => {
    b.classList.toggle("selected", cat !== null && b.dataset.cat == cat);
  });
  document.getElementById("send-btn").disabled = (cat === null);
}

// ====== ENVIAR ======
async function enviarClasificacion() {
  const archivo = imagenes[indiceActual];
  const cat = selecciones[archivo.id] ?? null;
  if (!cat || enviando) return;

  enviando = true;
  const btn = document.getElementById("send-btn");
  btn.innerHTML = "Enviando…";
  btn.disabled = true;

  try {
    await fetch(API_URL, {
      method: "POST",
      body: new URLSearchParams({
        imageId: archivo.id,
        categoria: cat
      })
    });

    showToast(`✓ Clasificado como ${etiquetaCategoria(cat)}`, "success");

    delete selecciones[archivo.id];
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





