const contentService = require('../services/content.service');
const htmlToDocx = require('html-to-docx');

const getContent = async (req, res, next) => {
  try {
    const result = await contentService.getContent(req.user._id, req.params.id, req.params.key);
    res.status(200).json({ success: true, content: result });
  } catch (error) {
    next(error);
  }
};

const putContent = async (req, res, next) => {
  try {
    const result = await contentService.putContent(req.user._id, req.params.id, req.params.key, req.body?.data);
    res.status(200).json({ success: true, content: result });
  } catch (error) {
    next(error);
  }
};

const listContentKeys = async (req, res, next) => {
  try {
    const keys = await contentService.listContentKeys(req.user._id, req.params.id, req.query.prefix || '');
    res.status(200).json({ success: true, keys });
  } catch (error) {
    next(error);
  }
};

const preprocessHtmlForDocx = (html) => {
  if (!html) return '';
  let clean = html;

  // 1. Convert Quill alignment, fonts, and indentation classes to inline style attributes
  clean = clean.replace(/<([a-z0-9]+)\s+([^>]*class="[^"]*"[^>]*)>/gi, (match, tagName, attrs) => {
    const classMatch = attrs.match(/class="([^"]*)"/i);
    const styleMatch = attrs.match(/style="([^"]*)"/i);
    
    const classes = classMatch ? classMatch[1].split(/\s+/) : [];
    const styles = styleMatch ? styleMatch[1].split(';').map(s => s.trim()).filter(Boolean) : [];
    
    classes.forEach(cls => {
      if (cls === 'ql-align-center') styles.push('text-align: center');
      if (cls === 'ql-align-right') styles.push('text-align: right');
      if (cls === 'ql-align-justify') styles.push('text-align: justify');
      if (cls === 'ql-indent-1') styles.push('margin-left: 0.5in');
      if (cls === 'ql-indent-2') styles.push('margin-left: 1.0in');
      if (cls === 'ql-indent-3') styles.push('margin-left: 1.5in');
      if (cls === 'ql-font-serif') styles.push('font-family: "Times New Roman", Georgia, serif');
      if (cls === 'ql-font-monospace') styles.push('font-family: "Courier New", Courier, monospace');
      if (cls === 'ql-size-small') styles.push('font-size: 8pt');
      if (cls === 'ql-size-large') styles.push('font-size: 18pt');
      if (cls === 'ql-size-huge') styles.push('font-size: 28pt');
    });
    
    let cleanAttrs = attrs
      .replace(/class="[^"]*"/gi, '')
      .replace(/style="[^"]*"/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
      
    if (styles.length > 0) {
      cleanAttrs += ` style="${styles.join('; ')};"`;
    }
    
    return `<${tagName} ${cleanAttrs}>`;
  });

  // 2. Ensure every img tag has explicit width and height attributes from styles or fallbacks
  clean = clean.replace(/<img\s+([^>]*style="[^"]*"[^>]*)>/gi, (match, attrs) => {
    const styleMatch = attrs.match(/style="([^"]*)"/i);
    const widthMatch = attrs.match(/width="([^"]*)"/i);
    const heightMatch = attrs.match(/height="([^"]*)"/i);
    
    let width = widthMatch ? widthMatch[1] : '';
    let height = heightMatch ? heightMatch[1] : '';
    
    if (styleMatch) {
      const styles = styleMatch[1];
      const wMatch = styles.match(/width:\s*([\d.]+)px/i);
      const hMatch = styles.match(/height:\s*([\d.]+)px/i);
      if (wMatch && !width) width = wMatch[1];
      if (hMatch && !height) height = hMatch[1];
    }
    
    if (!width) width = '400';
    if (!height) height = '300';
    
    let cleanAttrs = attrs;
    if (!widthMatch) cleanAttrs += ` width="${width}"`;
    if (!heightMatch) cleanAttrs += ` height="${height}"`;
    
    return `<img ${cleanAttrs}>`;
  });

  // For <img> tags without style but also without width/height attributes
  clean = clean.replace(/<img\s+([^>]+)>/gi, (match, attrs) => {
    if (attrs.includes('width=') || attrs.includes('height=')) return match;
    return `<img ${attrs} width="400" height="300">`;
  });

  // 3. Ensure tables have standard borders and styling
  clean = clean.replace(/<table([^>]*)>/gi, (match, attrs) => {
    let nextAttrs = attrs;
    if (!attrs.includes('border=')) nextAttrs += ' border="1"';
    if (!attrs.includes('style=')) nextAttrs += ' style="border-collapse: collapse; width: 100%; border: 1px solid #ccc;"';
    return `<table${nextAttrs}>`;
  });

  return clean;
};

const exportDocx = async (req, res, next) => {
  try {
    const { html, title, orientation, margins } = req.body;
    if (!html) {
      return res.status(400).json({ success: false, message: 'HTML content is required' });
    }

    const preprocessedHtml = preprocessHtmlForDocx(html);

    const opt = {
      title: title || 'Document',
      orientation: orientation || 'portrait',
      font: 'Arial',
      fontSize: 12,
      margins: margins || {
        top: 1440,
        bottom: 1440,
        left: 1440,
        right: 1440
      }
    };

    const docxBuffer = await htmlToDocx(preprocessedHtml, null, opt);
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(title || 'document')}.docx"`);
    res.status(200).send(docxBuffer);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getContent,
  putContent,
  listContentKeys,
  exportDocx
};
