import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
// webpack 将此 worker 文件打包为静态资源，返回其 URL
// Electron 离线环境也能正确加载，不依赖 CDN
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

export function isImageFile(file: File): boolean {
  return /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(file.name);
}

export async function renderPdfPagesToBase64(file: File): Promise<{base64: string; mimeType: string}[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const results: {base64: string; mimeType: string}[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2.0 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d')!;
    await page.render({ canvasContext: ctx, viewport }).promise;
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    results.push({ base64: dataUrl.split(',')[1], mimeType: 'image/jpeg' });
  }

  return results;
}

export async function extractFileContent(file: File): Promise<string> {
  const name = file.name.toLowerCase();

  if (name.endsWith('.txt') || name.endsWith('.md')) {
    return readAsText(file);
  }

  if (name.endsWith('.csv') || name.endsWith('.json') || name.endsWith('.xml') || name.endsWith('.html') || name.endsWith('.htm')) {
    return readAsText(file);
  }

  if (name.endsWith('.pdf')) {
    return extractPdf(file);
  }

  if (name.endsWith('.docx')) {
    return extractDocx(file);
  }

  if (name.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/)) {
    return `[图片文件: ${file.name}]\n文件大小: ${(file.size / 1024).toFixed(2)} KB\n上传后可以使用OCR功能识别文字。`;
  }

  if (name.endsWith('.doc')) {
    return `[Word 97-2003文档: ${file.name}]\n暂不支持 .doc 格式，请转换为 .docx 后重新上传。`;
  }

  if (name.endsWith('.pptx') || name.endsWith('.ppt')) {
    return `[PPT演示文稿: ${file.name}]\n暂不支持自动解析 PPT 格式。`;
  }

  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    return `[Excel表格: ${file.name}]\n暂不支持自动解析 Excel 格式。`;
  }

  return `[文件: ${file.name}]\n不支持自动解析此格式。`;
}

function readAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsText(file);
  });
}

async function extractPdf(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ');
    if (pageText.trim()) {
      pages.push(pageText);
    }
  }

  if (pages.length === 0) {
    return `[PDF文件: ${file.name}]\n未能提取到文本内容。该PDF可能为扫描件，请使用OCR功能识别。`;
  }

  return pages.join('\n\n');
}

async function extractDocx(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  if (!result.value.trim()) {
    return `[Word文档: ${file.name}]\n未能提取到文本内容。`;
  }
  return result.value;
}
