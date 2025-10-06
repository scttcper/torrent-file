import { files, hash, info } from '../../src/torrentFile.js';

function formatJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

async function readFileAsUint8Array(file: File): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

function setText(id: string, text: string) {
  const el = document.getElementById(id);
  if (!el) return;
  if (el.tagName === 'TEXTAREA') {
    (el as HTMLTextAreaElement).value = text;
  } else if (el.tagName === 'PRE' || el.tagName === 'CODE') {
    el.textContent = text;
  } else {
    el.textContent = text;
  }
}

async function handleTorrentFile(file: File) {
  const data = await readFileAsUint8Array(file);

  // Calculate outputs
  const i = info(data);
  const f = files(data);
  const h = hash(data);
  setText('raw', formatJson({ info: i, files: f, hash: h }));
}

function setupDragAndDrop() {
  const dropzone = document.getElementById('dropzone');
  const input = document.getElementById('fileInput') as HTMLInputElement | null;
  const chooseButtonDrop = document.getElementById('chooseButtonDrop') as HTMLButtonElement | null;
  if (!dropzone) return;

  const onFiles = (list: FileList | null) => {
    const file = list && list[0];
    if (file) void handleTorrentFile(file);
  };

  dropzone.addEventListener('dragover', e => {
    e.preventDefault();
    dropzone.classList.add('ring-2', 'ring-black', 'dark:ring-white');
  });
  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('ring-2', 'ring-black', 'dark:ring-white');
  });
  dropzone.addEventListener('drop', e => {
    e.preventDefault();
    dropzone.classList.remove('ring-2', 'ring-black', 'dark:ring-white');
    const dt = e.dataTransfer;
    onFiles(dt?.files ?? null);
  });

  input?.addEventListener('change', () => onFiles(input.files));
  chooseButtonDrop?.addEventListener('click', () => input?.click());
}

setupDragAndDrop();
