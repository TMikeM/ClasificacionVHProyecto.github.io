const API_URL = "https://script.google.com/macros/s/AKfycbxyK31Xjh0wIeE7Q7-9XRAtuexglp6uM8tA-5k-5ptXeEUrcUNPPmDL5l1I_W8yk4cB/exec";

// ====== ESTADO ======
let imagenes      = [];
let indiceActual  = 0;
let selecciones   = {};
let enviando      = false;

// ── Paginación ──
const PAGE_SIZE       = 30;
let paginaActual      = 0;
let totalImagenes     = 0;
let cargandoPagina    = false;
const PREFETCH_UMBRAL = 8;

const DOTS_VISIBLES = 9;

// ====== INIT ======
document.addEventListener("DOMContentLoaded", () => {
  cargarPagina(0, true);
  document.addEventListener("keydown", manejarTeclado);
});

// ====== CARGAR PÁGINA ======
async function cargarPagina(pagina, esInicio = false) {
  if (cargandoPagina) return;
  cargandoPagina = true;

  if (esInicio) setStatus("Cargando imágenes…");

  try {
    const res  = await fetch(`${API_URL}?action=imagenes&page=${pagina}&pageSize=${PAGE_SIZE}`);
    const data = await res.json();

    let nuevas;
    if (Array.isArray(data)) {
      totalImagenes = data.length;
      nuevas        = data.slice(pagina * PAGE_SIZE, (pagina + 1) * PAGE_SIZE);
    } else {
      totalImagenes = data.total ?? (imagenes.length + data.items.length);
      nuevas        = data.items;
    }

    const idsActuales = new Set(imagenes.map(i => i.id));
    const sinDuplicar = nuevas.filter(i => !idsActuales.has(i.id));
    imagenes = [...imagenes, ...sinDuplicar];

    paginaActual = pagina;

    if (!imagenes.length) {
      setStatus("✓ No hay imágenes pendientes.");
      ocultarViewer();
      return;
    }

    if (esInicio) {
      indiceActual = 0;
      renderDots();
      mostrarImagen(indiceActual);
    } else {
      renderDots();
    }
  } catch (err) {
    setStatus("❌ Error al cargar imágenes: " + err.message);
  } finally {
    cargandoPagina = false;
  }
}

function checkPrefetch() {
  const restantes = imagenes.length - 1 - indiceActual;
  const hayMas    = imagenes.length < totalImagenes;
  if (hayMas && restantes <= PREFETCH_UMBRAL && !cargandoPagina) {
    cargarPagina(paginaActual + 1);
  }
}

// ====== MOSTRAR IMAGEN ======
function mostrarImagen(idx) {
  const img     = document.getElementById("vh-image");
  const zoomImg = document.getElementById("zoom-img");

  img.style.opacity = "0";

  setTimeout(() => {
    const archivo = imagenes[idx];

    // Usar la URL con driveId que viene del GS, fallback al thumbnail simple
    const src = archivo.url
      || `https://drive.google.com/thumbnail?id=${archivo.id}&sz=w1600`;

    // onload/onerror ANTES de asignar src (fix para imágenes en caché del browser)
    img.onload  = () => { img.style.opacity = "1"; };
    img.onerror = () => {
      img.style.opacity = "1";
      setStatus("⚠️ No se pudo cargar: " + archivo.name);
    };
    img.src = src;

    zoomImg.onload  = () => {};
    zoomImg.onerror = () => {};
    zoomImg.src     = src;

    setStatus(archivo.name);
    document.getElementById("counter").textContent =
      `${idx + 1} / ${totalImagenes || imagenes.length}`;

    document.getElementById("btn-prev").disabled = idx === 0;
    const esUltima = idx === imagenes.length - 1 && imagenes.length >= totalImagenes;
    document.getElementById("btn-next").disabled = esUltima;

    actualizarDots(idx);
    restaurarSeleccion(selecciones[archivo.id] ?? null);
    checkPrefetch();
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

// ====== DOTS ======
function renderDots() {
  const bar = document.getElementById("dots-bar");
  bar.innerHTML = "";

  const total = imagenes.length;
  if (total <= 1) return;

  const cantidad = Math.min(total, DOTS_VISIBLES);
  for (let i = 0; i < cantidad; i++) {
    const d = document.createElement("span");
    d.className = "dot";
    bar.appendChild(d);
  }
  actualizarDots(indiceActual);
}

function actualizarDots(idx) {
  const bar    = document.getElementById("dots-bar");
  const dotEls = bar.querySelectorAll(".dot");
  if (!dotEls.length) return;

  const total    = imagenes.length;
  const cantidad = dotEls.length;

  let inicio = idx - Math.floor(cantidad / 2);
  inicio = Math.max(0, inicio);
  inicio = Math.min(inicio, total - cantidad);

  dotEls.forEach((d, i) => {
    const realIdx = inicio + i;
    const nuevo   = d.cloneNode(true);
    d.parentNode.replaceChild(nuevo, d);

    nuevo.classList.toggle("active", realIdx === idx);
    nuevo.classList.remove("dot-sm", "dot-xs");

    if (total > cantidad) {
      if      (i === 0            && inicio > 0)                nuevo.classList.add("dot-xs");
      else if (i === 1            && inicio > 0)                nuevo.classList.add("dot-sm");
      else if (i === cantidad - 1 && inicio + cantidad < total) nuevo.classList.add("dot-xs");
      else if (i === cantidad - 2 && inicio + cantidad < total) nuevo.classList.add("dot-sm");
    }

    nuevo.onclick = () => { indiceActual = realIdx; mostrarImagen(realIdx); };
    nuevo.title   = `Imagen ${realIdx + 1}`;
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
  const cat     = selecciones[archivo.id] ?? null;
  if (!cat || enviando) return;

  enviando = true;
  const btn = document.getElementById("send-btn");
  btn.innerHTML = "Enviando…";
  btn.disabled  = true;

  try {
    await fetch(API_URL, {
      method: "POST",
      body: new URLSearchParams({ imageId: archivo.id, categoria: cat })
    });

    showToast(`✓ Clasificado como ${etiquetaCategoria(cat)}`, "success");

    delete selecciones[archivo.id];
    imagenes.splice(indiceActual, 1);
    totalImagenes = Math.max(0, totalImagenes - 1);

    if (!imagenes.length) {
      if (imagenes.length < totalImagenes) {
        paginaActual  = 0;
        imagenes      = [];
        totalImagenes = 0;
        await cargarPagina(0, true);
        return;
      }
      setStatus("✓ Todas las imágenes clasificadas.");
      ocultarViewer();
      return;
    }

    if (indiceActual >= imagenes.length) indiceActual = imagenes.length - 1;
    renderDots();
    mostrarImagen(indiceActual);
    checkPrefetch();

  } catch (err) {
    showToast("❌ Error al guardar: " + err.message, "error");
    btn.disabled = false;
  } finally {
    enviando = false;
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
      <line x1="22" y1="2" x2="11" y2="13"/>
      <polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg> Confirmar clasificación`;
  }
}

// ====== HELPERS ======
function setStatus(msg) {
  document.getElementById("status").textContent = msg;
}

function ocultarViewer() {
  document.querySelector(".viewer-wrapper").style.opacity  = "0.3";
  document.querySelector(".buttons").style.pointerEvents   = "none";
  document.getElementById("dots-bar").innerHTML            = "";
  document.getElementById("counter").textContent           = "";
  document.getElementById("btn-prev").disabled             = true;
  document.getElementById("btn-next").disabled             = true;
  document.getElementById("send-btn").style.display        = "none";
}

function etiquetaCategoria(cat) {
  const labels = { "1": "Grado 1", "2": "Grado 2", "3": "Grado 3", "4": "Grado 4", "nofuncional": "No evaluable" };
  return labels[cat] || cat;
}

function showToast(msg, type = "") {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.className   = "toast show " + type;
  setTimeout(() => { t.className = "toast"; }, 3500);
}

// ====== ZOOM ======
function abrirZoom()  { document.getElementById("zoom").style.display = "flex"; }
function cerrarZoom() { document.getElementById("zoom").style.display = "none"; }

