function generate_atlat(font_family, font_height) {
  const atlat_canvas = document.createElement('canvas')
  const ctx = atlat_canvas.getContext('2d')

  function* get_glyphs() {
    for (let i = 'A'.charCodeAt(0); i <= 'Z'.charCodeAt(0); ++i) yield i
    for (let i = 'a'.charCodeAt(0); i <= 'z'.charCodeAt(0); ++i) yield i
    for (let i = '0'.charCodeAt(0); i <= '9'.charCodeAt(0); ++i) yield i
    yield " ".charCodeAt(0);
  }

  const glyphs = String.fromCharCode(...get_glyphs())
  const atlat_height = Math.ceil(Math.sqrt(glyphs.length) / 2) * 4
  const atlat_width = Math.ceil(glyphs.length / atlat_height)

  ctx.font = `${font_height}px monospace`
  let max_width = 0
  for (let i = 0; i < glyphs.length; ++i) {
    max_width = Math.max(max_width, Math.ceil(ctx.measureText(glyphs[i]).width))
  }

  atlat_canvas.width = max_width * atlat_width
  atlat_canvas.height = font_height * atlat_height

  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, atlat_canvas.width, atlat_canvas.height)

  ctx.fillStyle = '#ffffff'
  ctx.font = `${font_height}px ${font_family}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  for (let i = 0; i < glyphs.length; ++i) {
    const y = font_height * (Math.floor(i / atlat_width) + 0.5)
    const x = max_width * ((i % atlat_width) + 0.5)

    ctx.fillText(glyphs[i], x, y)
  }

  const glyph_map = new Map()
  for (let i = 0; i < glyphs.length; ++i) glyph_map.set(glyphs[i], i)

  return {
    width: atlat_width,
    height: atlat_height,
    glyph_width: max_width,
    glyph_height: font_height,
    glyph_map,
    data: ctx.getImageData(0, 0, atlat_canvas.width, atlat_canvas.height)
  }
}

function compress_data(imgdata) {
  const compressed = new Uint8ClampedArray(imgdata.data.length / 4)
  const width = imgdata.width;
  const height = imgdata.height / 4;

  for (let i = 0; i < height; ++i) {
    for (let j = 0; j < width; ++j) {
      for (let k = 0; k < 4; ++k) {
        const r = imgdata.data[4 * (width * (height * k + i) + j) + 0]
        const g = imgdata.data[4 * (width * (height * k + i) + j) + 1]
        const b = imgdata.data[4 * (width * (height * k + i) + j) + 2]
        compressed[4 * (width * i + j) + k] = Math.max(r, g, b)
      }
    }
  }

  return new ImageData(compressed, width, height)
}

// TODO: Draw text inside WebGL

function draw_glyph(atlas, char, size) {
  const idx = atlas.glyph_map.get(char) || (atlas.glyph_map.size - 1)
  const width = Math.round(size * atlas.glyph_width / atlas.glyph_height)
  const height = size
  const data = new Uint8ClampedArray(width * height * 4)

  const x = atlas.glyph_width * (idx % atlas.width)
  const yc = Math.floor(idx / atlas.width)
  const y = atlas.glyph_height * (yc % (atlas.height / 4))
  const c = Math.floor(yc / (atlas.height / 4))

  for (let i = 0; i < height; ++i) {
    for (let j = 0; j < width; ++j) {
      const idxx = (x + Math.floor(j * atlas.glyph_width / width))
      const idxy = (y + Math.floor(i * atlas.glyph_height / height))
      const data_idx = 4 * (atlas.data.width * idxy + idxx)

      for (let k = 0; k < 3; ++k) {
        data[4 * (width * i + j) + k] = atlas.data.data[data_idx + c]
      }
      data[4 * (width * i + j) + 3] = 255
    }
  }

  return new ImageData(data, width, height)
}

function draw_text(atlas, str, size) {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  const scale = Math.round(size * atlas.glyph_width / atlas.glyph_height)

  canvas.width = scale * str.length
  canvas.height = size

  console.log(canvas.width)

  for (let i = 0; i < str.length; ++i) {
    const glyph = draw_glyph(atlas, str[i], size)
    ctx.putImageData(glyph, scale * i, 0)
  }

  return ctx.getImageData(0, 0, canvas.width, canvas.height)
}

function display_imgdata(imgdata) {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  canvas.width = imgdata.width
  canvas.height = imgdata.height
  ctx.putImageData(imgdata, 0, 0)

  const img = new Image()
  img.src = canvas.toDataURL('image/png')

  document.body.append(img)
}

const atlas = generate_atlat('monospace', 32)
display_imgdata(atlas.data)

atlas.data = compress_data(atlas.data)
display_imgdata(atlas.data)

const text = draw_text(atlas, "Hello", 128)
display_imgdata(text)

