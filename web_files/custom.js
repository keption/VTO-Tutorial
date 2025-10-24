import * as THREE from 'three';
import {
  MindARThree
} from 'mindar-face-three';
import {
  EffectComposer
} from 'effectComposer';
import {
  RenderPass
} from 'renderPass';
import {
  ShaderPass
} from 'shaderPass';
import {
  HorizontalBlurShader
} from 'horizontalBlurShader';
import {
  VerticalBlurShader
} from 'verticalBlurShader';

var container = document.querySelector(".makeup-vto");
// Ensure globals are accessible within ESM context
const $ = window.jQuery || window.$;
var loader2 = document.querySelector('.loader-2');
var capturedImage = document.querySelector('.image-captured');
var captureWrapper = document.querySelector('.capture-wrapper');
var downloader = document.querySelector('#downloader');
var lightingDetect = document.querySelector('.lighting-detect')
var divider = document.querySelector(".divider");

const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);

let userName = urlParams.get('name');
let season = urlParams.get('season');
let complexion = urlParams.get('complexion');
let product = urlParams.get('product');
let color = urlParams.get('color');

const mindarThree = new MindARThree({
  container: container,
  filterMinCF: 0.0001,
  filterBeta: 10000,
});

var clickSfx = new (window.Howl || Howl)({
  src: './assets/sfx/click.mp3',
  loop: false,
});

const {
  renderer,
  scene,
  camera
} = mindarThree;

let glitterVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

let glitterFragmentShader = `
  uniform sampler2D baseTexture;
  varying vec2 vUv;

  // Function to generate static random noise
  float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
  }

  void main() {
    vec4 color = texture2D(baseTexture, vUv);
    
    // Generate static random noise for particles
    float rnd = random(vUv * 0.0);
    
    // Add static white snow-like particles
    if (rnd > 0.999) {
      color.rgb += vec3(1.5);
    }

    gl_FragColor = color;
  }
`;

const faceMesh = mindarThree.addFaceMesh();
const eyeshadowMesh = mindarThree.addFaceMesh();
const eyeshadowGlitterMesh = mindarThree.addFaceMesh();
const blushonMesh = mindarThree.addFaceMesh();
const lipstickMesh = mindarThree.addFaceMesh();
const lipstickGlossyMesh = mindarThree.addFaceMesh();

const textureLoader = new THREE.TextureLoader();
textureLoader.crossOrigin = 'anonymous';

let fullFaceTexture = textureLoader.load('./facemap_1024/fullface.png', function () {
  changeTextureColor(fullFaceTexture, '#fff1e7');
});

let eyeshadowTexture = textureLoader.load('./facemap_1024/eyeshadow.png');

let eyeshadowGlitterTexture = textureLoader.load('./facemap_1024/glitter.png');

let blushTexture = textureLoader.load('./facemap_1024/blushon.png');

let lipstickTexture = textureLoader.load('./facemap_1024/lipstick.png')

let lipstickGlossyTexture = textureLoader.load('./facemap_1024/lipstick-glossy.png');

const faceMaterial = new THREE.MeshBasicMaterial({
  map: fullFaceTexture,
  opacity: 0.16,
  transparent: true
});

const eyeshadowMaterial = new THREE.MeshBasicMaterial({
  map: eyeshadowTexture,
  opacity: 0.35,
  transparent: true,
  visible: false
});

const eyeshadowGlitterMaterial = new THREE.ShaderMaterial({
  uniforms: {
    baseTexture: { value: eyeshadowGlitterTexture },
  },
  vertexShader: glitterVertexShader,
  fragmentShader: glitterFragmentShader,
  transparent: true,
  visible: false,
  opacity: 1,
});

const blushMaterial = new THREE.MeshBasicMaterial({
  map: blushTexture,
  opacity: 0.17,
  transparent: true,
  visible: false
});

const lipstickMaterial = new THREE.MeshBasicMaterial({
  map: lipstickTexture,
  opacity: 0.3,
  transparent: true,
  visible: false
});

const lipstickGlossyMaterial = new THREE.MeshBasicMaterial({
  map: lipstickGlossyTexture,
  opacity: 0.5,
  transparent: true,
  visible: false
});

faceMesh.material = faceMaterial;
eyeshadowMesh.material = eyeshadowMaterial;
eyeshadowGlitterMesh.material = eyeshadowGlitterMaterial;
blushonMesh.material = blushMaterial;
lipstickMesh.material = lipstickMaterial;
lipstickGlossyMesh.material = lipstickGlossyMaterial;

scene.add(lipstickMesh, lipstickGlossyMesh, blushonMesh);

const glitterScene = new THREE.Scene();
glitterScene.add(eyeshadowMesh, eyeshadowGlitterMesh);

const faceScene = new THREE.Scene();
faceScene.add(faceMesh);

const faceCanvas = document.createElement('canvas');
faceCanvas.id = 'full_face_canvas';
container.appendChild(faceCanvas);
const faceRenderer = new THREE.WebGLRenderer({
  canvas: faceCanvas,
  alpha: true
});

const glitterCanvas = document.createElement('canvas');
glitterCanvas.id = 'glitter_canvas';
container.appendChild(glitterCanvas);

// Create a WebGLRenderer using the WebGL canvas
const glitterRenderer = new THREE.WebGLRenderer({
  canvas: glitterCanvas,
  alpha: true
});

// Create another canvas for 2D drawing (if needed)
const glitter2DCanvas = document.createElement('canvas');
glitter2DCanvas.id = 'glitter_2d_canvas';
container.appendChild(glitter2DCanvas);

// Get the 2D context from the 2D canvas
const glitter2DContext = glitter2DCanvas.getContext('2d');

// Create and append the original canvas
const canvasVideo = document.createElement('canvas');
canvasVideo.id = 'video_canvas';
container.appendChild(canvasVideo);
const context = canvasVideo.getContext('2d');

// Clone the original canvas
const cloneCanvas = document.createElement('canvas');
cloneCanvas.id = 'cloned_video_canvas';
cloneCanvas.width = canvasVideo.width;
cloneCanvas.height = canvasVideo.height;
const cloneContext = cloneCanvas.getContext('2d');

// Append the cloned canvas to the divider
divider.appendChild(cloneCanvas);

const horizontalBlurFace = new ShaderPass(HorizontalBlurShader);
horizontalBlurFace.uniforms.h.value = 0;
const verticalBlurFace = new ShaderPass(VerticalBlurShader);
verticalBlurFace.uniforms.v.value = 0;

const horizontalBlur = new ShaderPass(HorizontalBlurShader);
horizontalBlur.uniforms.h.value = 0;
const verticalBlur = new ShaderPass(VerticalBlurShader);
verticalBlur.uniforms.v.value = 0;

const faceComposer = new EffectComposer(faceRenderer);
const faceRenderPass = new RenderPass(faceScene, camera);
faceComposer.addPass(faceRenderPass);
faceComposer.addPass(horizontalBlurFace);
faceComposer.addPass(verticalBlurFace);

const glitterComposer = new EffectComposer(glitterRenderer);
const glitterRenderPass = new RenderPass(glitterScene, camera);
glitterComposer.addPass(glitterRenderPass);

const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);
composer.addPass(horizontalBlur);
composer.addPass(verticalBlur);

function updateCanvasSize() {
  canvasVideo.width = mindarThree.video.offsetWidth;
  canvasVideo.height = mindarThree.video.offsetHeight;
  canvasVideo.style.top = mindarThree.video.style.top;
  canvasVideo.style.left = mindarThree.video.style.left;

  cloneCanvas.width = mindarThree.video.offsetWidth;
  cloneCanvas.height = mindarThree.video.offsetHeight;
  cloneCanvas.style.top = mindarThree.video.style.top;
  cloneCanvas.style.left = mindarThree.video.style.left;

  glitterCanvas.width = mindarThree.video.offsetWidth;
  glitterCanvas.height = mindarThree.video.offsetHeight;
  glitterCanvas.style.top = mindarThree.video.style.top;
  glitterCanvas.style.left = mindarThree.video.style.left;

  glitter2DCanvas.width = mindarThree.video.offsetWidth;
  glitter2DCanvas.height = mindarThree.video.offsetHeight;
  glitter2DCanvas.style.top = mindarThree.video.style.top;
  glitter2DCanvas.style.left = mindarThree.video.style.left;

  faceCanvas.width = mindarThree.video.offsetWidth;
  faceCanvas.height = mindarThree.video.offsetHeight;
  faceCanvas.style.top = mindarThree.video.style.top;
  faceCanvas.style.left = mindarThree.video.style.left;
  
  glitterRenderer.setSize(glitterCanvas.width, glitterCanvas.height);
  glitterComposer.setSize(glitterCanvas.width, glitterCanvas.height);

  faceRenderer.setSize(faceCanvas.width, faceCanvas.height);
  faceComposer.setSize(faceCanvas.width, faceCanvas.height);
}

renderer.outputEncoding = THREE.sRGBEncoding;
faceRenderer.outputEncoding = THREE.sRGBEncoding;
glitterRenderer.outputEncoding = THREE.sRGBEncoding;

let bufferLengthVidCanvas = 2;
let bufferLengthGlitter = 10;

var isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent || navigator.vendor || (window.opera && opera.toString() === `[object Opera]`));
if (isIOS) {
  bufferLengthVidCanvas = 1;
}

const frameBuffer = [];
let bufferIndex = 0;

const frameBufferGlitter = [];
let bufferIndexGlitter = 0;

function calculateAverageBrightness(imageData) {
  let totalBrightness = 0;
  const data = imageData.data;
  const length = data.length;

  for (let i = 0; i < length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const brightness = (r + g + b) / 3;
    totalBrightness += brightness;
  }

  return totalBrightness / (length / 4);
}

const start = async () => {
  try {
    await mindarThree.start();

    renderer.setAnimationLoop(() => {
      updateCanvasSize();

      composer.render();
      faceComposer.render();
      glitterComposer.render();
      
      context.drawImage(mindarThree.video, 0, 0, canvasVideo.width, canvasVideo.height);
      glitter2DContext.drawImage(glitter2DCanvas, 0, 0, glitter2DCanvas.width, glitter2DCanvas.height);

      // Create and draw on frame
      const frame = document.createElement('canvas');
      frame.width = canvasVideo.width;
      frame.height = canvasVideo.height;
      const frameContext = frame.getContext('2d');
      frameContext.drawImage(mindarThree.video, 0, 0, frame.width, frame.height);

      // Create frameGlitter with dimensions
      const frameGlitter = document.createElement('canvas');
      const frameGlitterContext = frameGlitter.getContext('2d');
      frameGlitterContext.drawImage(glitter2DCanvas, 0, 0, frame.width, frame.height);

      frameBuffer[bufferIndex] = frame;
      bufferIndex = (bufferIndex + 1) % bufferLengthVidCanvas;

      if (frameBuffer.length === bufferLengthVidCanvas) {
        context.drawImage(frameBuffer[bufferIndex], 0, 0, canvasVideo.width, canvasVideo.height);
        glitter2DContext.drawImage(frameBuffer[bufferIndex], 0, 0, canvasVideo.width, canvasVideo.height);
        cloneContext.drawImage(frameBuffer[bufferIndex], 0, 0, canvasVideo.width, canvasVideo.height);
      }
      
      frameBufferGlitter[bufferIndexGlitter] = frame;
      bufferIndexGlitter = (bufferIndexGlitter + 1) % bufferLengthGlitter;
      
      if (frameBufferGlitter.length === bufferLengthGlitter) {
        glitterFragmentShader = `
          uniform sampler2D baseTexture;
          varying vec2 vUv;
          uniform float time; // Add uniform for time
          
          float random(vec2 st) {
            return fract(sin(dot(st.xy, vec2(12.9898, 78.233)) + time) * 43758.5453123);
          }

          void main() {
            vec4 color = texture2D(baseTexture, vUv);
            float rnd = random(vUv * 5000.0);

            // Adjust the threshold for particle density
            if (rnd > 0.91) { // Increased threshold
              color.rgb += vec3(1.5); // Add white particles
            }

            gl_FragColor = color;
          }
        `;
    
        eyeshadowGlitterMaterial.uniforms.time = { value: performance.now() / 500000 };
        eyeshadowGlitterMaterial.fragmentShader = glitterFragmentShader;
        eyeshadowGlitterMaterial.needsUpdate = true;
      }
      

      // Get the image data from the canvas
      const imageData = context.getImageData(0, 0, canvasVideo.width, canvasVideo.height);

      // Calculate the average brightness
      const avgBrightness = calculateAverageBrightness(imageData);

      // Adjust the threshold according to your needs
      const darknessThreshold = 90;

      if (avgBrightness < darknessThreshold) {
        lightingDetect.style.display = 'block';
        scene.visible = false;
        glitterScene.visible = false;
        faceScene.visible = false;
      } else {
        lightingDetect.style.display = 'none';
        scene.visible = true;
        glitterScene.visible = true; // Make sure glitterScene is visible
        faceScene.visible = true;
      }
    });

    document.querySelector('.loader').style.display = 'none';
  } catch (error) {
    console.error('Error starting MindARThree:', error);
    $('.loader > .loader-image').fadeOut(200, function() {
      $('.loader > small').text('Camera access is blocked, Please allow camera access in your browser settings.').addClass('text-danger');
    });
  }
};

start();

const originalImageData = {};
const gammaFactorValue = 1.6;

function applyGammaCorrection(value, gammaFactor = gammaFactorValue) {
  return Math.pow(value, 1 / gammaFactor);
}

function changeTextureColor(texture, colorHex, material) {
  if (!texture.image) {
    console.error('Texture image not loaded.');
    return;
  }

  if (!originalImageData[texture.uuid]) {
    const canvas = document.createElement('canvas');
    canvas.width = texture.image.width;
    canvas.height = texture.image.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(texture.image, 0, 0);

    originalImageData[texture.uuid] = ctx.getImageData(0, 0, canvas.width, canvas.height);
  }

  const canvas = document.createElement('canvas');
  canvas.width = texture.image.width;
  canvas.height = texture.image.height;
  const ctx = canvas.getContext('2d');

  ctx.putImageData(originalImageData[texture.uuid], 0, 0);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // Define the color and gamma factor
  const color = new THREE.Color(colorHex);
  const rColor = color.r; // in [0, 1]
  const gColor = color.g; // in [0, 1]
  const bColor = color.b; // in [0, 1]

  const lowerThreshold = 0; // Minimum brightness (black)
  const upperThreshold = 200; // Maximum brightness (full brightness)

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Calculate the brightness of the pixel
    const brightness = (r + g + b) / 3;

    // Check if the pixel is within the desired brightness range
    if (brightness >= lowerThreshold && brightness <= upperThreshold) {
      // Check if the pixel is white
      if (!(r === 255 && g === 255 && b === 255)) {
        // Apply gamma correction to the color components
        const correctedR = applyGammaCorrection(rColor);
        const correctedG = applyGammaCorrection(gColor);
        const correctedB = applyGammaCorrection(bColor);

        data[i] = correctedR * 255; // Red
        data[i + 1] = correctedG * 255; // Green
        data[i + 2] = correctedB * 255; // Blue
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);

  texture.image.src = canvas.toDataURL();
  if (material !== undefined) {
    material.visible = true;
    material.needsUpdate = true;
  }
  texture.needsUpdate = true;
}


function takeScreenshot(callback) {
  try {
    loader2.style.display = 'flex';

    // Ensure latest frame rendered
    renderer.render(scene, camera);
    faceRenderer.render(faceScene, camera);
    glitterRenderer.render(glitterScene, camera);

    const w = canvasVideo.width;
    const h = canvasVideo.height;
    if (!w || !h) {
      console.warn('Video canvas has no size yet');
    }

    const out = document.createElement('canvas');
    out.width = w || 720;
    out.height = h || 1280;
    const ctx = out.getContext('2d');

    // 1) Video layer mirrored
    ctx.save();
    ctx.translate(out.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(canvasVideo, 0, 0, out.width, out.height);
    ctx.restore();

    // 2) Full face canvas with blur+saturate, slight scaleY and y offset
    ctx.save();
    ctx.filter = 'blur(7px) saturate(1.7)';
    ctx.globalAlpha = 0.93;
    const faceScaleY = 1.04;
    const faceYOffset = -24;
    ctx.drawImage(faceRenderer.domElement, 0, faceYOffset, out.width, Math.round(out.height * faceScaleY));
    ctx.restore();

    // 3) Glitter canvas (2D overlay result)
    ctx.save();
    ctx.drawImage(glitterRenderer.domElement, 0, 0, out.width, out.height);
    ctx.restore();

    // 4) Makeup canvas with blur/brightness/contrast
    ctx.save();
    ctx.filter = 'blur(2px) brightness(75%) contrast(190%)';
    ctx.drawImage(renderer.domElement, 0, 0, out.width, out.height);
    ctx.restore();

    const dataUrl = out.toDataURL('image/png');
    downloader.href = dataUrl;
    downloader.download = 'makeup-vto.png';
    capturedImage.setAttribute('src', dataUrl);
    loader2.style.display = 'none';

    // Show modal preview
    try {
      const modalEl = document.getElementById('modal_capture');
      if (modalEl && window.bootstrap && window.bootstrap.Modal) {
        // Support older BS versions: use constructor if getOrCreateInstance missing
        const ModalCtor = window.bootstrap.Modal;
        const modal = ModalCtor.getOrCreateInstance ? ModalCtor.getOrCreateInstance(modalEl, { backdrop: 'static', keyboard: false }) : new ModalCtor(modalEl, { backdrop: 'static', keyboard: false });
        modal.show();
      }
    } catch (e) { console.warn('Modal show failed', e); }

    if (typeof callback === 'function') callback(dataUrl);
  } catch (err) {
    console.error('takeScreenshot failed:', err);
    loader2.style.display = 'none';
  }
}
async function shareImage() {
  try {
    const imageUrl = capturedImage.getAttribute('src');
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    const blob = await response.blob();
    const file = new File([blob], 'makeup-vto.png', {
      type: 'image/png'
    });

    if (window.navigator.share) {
      await navigator.share({
        files: [file]
      });
      console.log('Image shared successfully');
    } else {
      console.warn('Web Share API not supported in this browser.');
    }
  } catch (error) {
    console.error('Error sharing image:', error);
  }
}

$('.button-capture').on('click', function (e) {
  e.preventDefault();
  takeScreenshot(() => {});
});

$('.button-share').on('click', function () {
  shareImage();
});

$('.button-download').on('click', function () {
  try { if (downloader && downloader.href) downloader.click(); } catch (e) {}
});

window.addEventListener('resize', updateCanvasSize);

$(document).ready(function () {
  function slideMoving(container, target) {
    var targetWidth = target.outerWidth();
    var targetheight = target.outerHeight();

    container.css('position', 'relative');
    target.css('position', 'relative');

    if(container.children('.moving-slide').length === 0){
      container.prepend('<div class="moving-slide" />');
    }

    setTimeout(function(){
      var targetLeft = target.position().left + container.scrollLeft();
      container.children('.moving-slide').css({
        'width': targetWidth + 'px', 
        'height': targetheight + 'px', 
        'position': 'absolute',
        'top': '0',
        'left': targetLeft + 'px',
        'transition': 'all 0.5s'
      });

    }, 50);
  }

  $('.username-menu > strong').text(userName);

  function renderLipstick(data){
    var image;
    var type = '';
    data?.map(function(lipstick, index) {
      const cat = (lipstick.category || '');
      if(cat === 'Matte Lip Cream'){
        image = 'lipstick1.png';
        type = 'matte';
      }else if(cat === 'Moist Dew Tint'){
        image = 'lipstick6.png';
        type = 'glossy';
      }else if(cat === 'Glasting Liquid Lip'){
        image = 'lipstick2.png';
        type = 'glossy';
      }else if(cat === 'Colorfit Velvet Matte Lip Mousse'){
        image = 'lipstick3.png';
        type = 'matte';
      }else if(cat === 'Colorfit Last All Day Lip Paint'){
        image = 'lipstick4.png';
        type = 'matte';
      }else if(cat === 'Colorfit Ultralight Matte Lipstick'){
        image = 'lipstick5.png';
        type = 'matte';
      }else{
        type = ''
      }

      $('#tab_lipstick .carousel').append(
        `
          <li class="nav-item" role="presentation">
            <button class="nav-link" data-bs-toggle="tab" href="#lipstick_${index+1}" type="button" role="tab">
              <img src="./assets/images/${image}" alt=""/>
              <p>${cat}</p>
            </button>
          </li>
        `
      )

      $('#tab_lipstickContent').append(
        `
          <div class="tab-pane fade" id="lipstick_${index+1}" role="tabpanel">
            <controls class='controls-color horizontal-scroll lipstick' data-type="lipstick">
            ${lipstick.item.map(function(i) {
              return `<a class='controlButton' style="background-color: ${i.color}" data-type="${type}">${i.code}</a>`
              }).join('')
            }
            </controls>
          </div>
        `
      )
    })
  };

  function renderComplexion(data, complexionData){
    data?.map(function(foundation, index) {
      const type = foundation.category || '';

      if(foundation.type === 'complexion'){
        $('#tab_complexion .carousel').append(
          `
            <li class="nav-item" role="presentation">
              <button class="nav-link" data-bs-toggle="tab" href="#complexion_${index+1}" type="button" role="tab">
                <img src="${foundation.image}" alt=""/>
              </button>
            </li>
          `
          )

        if (index === 1) {
          $('#tab_complexionContent').append(
            `
              <div class="tab-pane fade" id="complexion_${index+1}" role="tabpanel">
                <controls class='controls-color horizontal-scroll complexion' data-type="complexion">
                  ${complexionData?.map(function name(item) {
                    if (item.code == '#21C' || item.code == '#21W' || item.code == '#22N' || item.code == '#23W' || item.code == '#31W' || item.code == '#32N' || item.code == '#33W' || item.code == '#42N') {
                      return `<a class="controlButton" style="background-color: ${item.item[0].color}" data-bg="${item.item[0].color}" data-type="${type}">${item.code.replace('#', '')}</a>`
                    }
                  }).join('')}
                </controls>
              </div>
            `
          );
        } else {
          $('#tab_complexionContent').append(
            `
              <div class="tab-pane fade" id="complexion_${index+1}" role="tabpanel">
                <controls class='controls-color horizontal-scroll complexion' data-type="complexion">
                  ${complexionData?.map(function name(item) {
                    return `<a class="controlButton" style="background-color: ${item.item[0].color}" data-bg="${item.item[0].color}" data-type="${type}">${item.code.replace('#', '')}</a>`
                  }).join('')}
                </controls>
              </div>
            `
          );
        }
      }
    })
  };
  
  function renderLightening(data, complexionData){
    data?.map(function(foundation, index) {
      const type = foundation.category || '';

      if(foundation.type === 'lightening'){
        $('#tab_lightening .carousel').append(
          `
            <li class="nav-item" role="presentation">
              <button class="nav-link" data-bs-toggle="tab" href="#foundation_${index+4}" type="button" role="tab">
                <img src="${foundation.image}" alt=""/>
              </button>
            </li>
          `
          )

        $('#tab_lighteningContent').append(
          `
            <div class="tab-pane fade" id="foundation_${index+4}" role="tabpanel">
              <controls class='controls-color horizontal-scroll foundation' data-type="foundation">
                ${complexionData?.map(function name(item) {
                  return `<a class="controlButton" style="background-color: ${item.item[0].color}" data-bg="${item.item[0].color}" data-type="${type}">${item.code.replace('#', '')}</a>`
                }).join('')}
              </controls>
            </div>
          `
        );
      }
    })
  };
  
  function renderEyeshadow(data){
    var image;
    data?.map(function(eyeshadow, index) {
      if(eyeshadow.category === 'Exclusive Eyeshadow 01 Sunset Brown' || eyeshadow.category === 'Exclusive Eyeshadow 02 Rose Gold'){
        image = 'colorfit-eyeshadow.png';
      }else if(eyeshadow.category === 'Colorfit Quad Eye Palette'){
        image = 'quad-eyeshadow.png';
      }

      $('#tab_eyeshadow .carousel').append(
        `
          <li class="nav-item" role="presentation">
            <button class="nav-link" data-bs-toggle="tab" href="#eyeshadow_${index+1}" type="button" role="tab">
              <img src="./assets/images/${image}" alt=""/>
              <p>${eyeshadow.category}</p>
            </button>
          </li>
        `
        )

        $('#tab_eyeshadowContent').append(
          `
            <div class="tab-pane fade" id="eyeshadow_${index+1}" role="tabpanel">
              <controls class='controls-color horizontal-scroll eyeshadow' data-type="eyeshadow">
                ${eyeshadow.item.map(function(i) {
                  return i.colors.map(function(color) {
                    var type = ''; // Initialize 'type' for each color
                    if (color.indexOf('glitter') !== -1) {
                      type = 'glitter';
                    }else{
                      type = ''
                    }
                    return `<a class='controlButton' style="background-color: ${color}" data-type="${type}" data-eyeshadow-type="${color}"></a>`;
                  }).join(''); // Join the buttons for each color
                }).join('')}
              </controls>
            </div>
          `
        )
    })
  };

  function renderBlush(data){
    var type = '';
    data?.map(function(blush, index) {
      if(blush.category === 'Colorfit Cream Blush'){
        type = 'creamy';
      }else{
        type = '';
      }

      $('#tab_blush .carousel').append(
        `
          <li class="nav-item" role="presentation">
            <button class="nav-link" data-bs-toggle="tab" href="#blush_${index+1}" type="button" role="tab">
              <img src="${blush.image}" alt=""/>
              <p>${blush.category}</p>
            </button>
          </li>
        `
        )

        $('#tab_blushContent').append(
          `
            <div class="tab-pane fade" id="blush_${index+1}" role="tabpanel">
              <controls class='controls-color horizontal-scroll blush' data-type="blush">
                <a class='controlButton' style="background-color: ${blush.color}" data-type="${type}"></a>
              </controls>
            </div>
          `
          )
    })
  };

  $('.arrow-back').on('click', function() {
    $('.menu').addClass('menu-open');
  })

  $('.menu-close').on('click', function() {
    $('.menu').removeClass('menu-open');
  })

  var templateAPI = './template.json';
  function fetchProducts() {
    $('.loader-2').fadeIn(200).css('display', 'flex');

    // Set default values if URL parameters are missing
    if (!season) season = 'WARM SPRING';
    if (!complexion) complexion = '#11C';
    if (!product) product = 'complexion';
    if (!color) color = '#F3C4BF';

    let resultData = {};

    $('img.category-season').attr('src', `./assets/images/seasonal/${season.toLocaleLowerCase()}.png`)

    fetch(templateAPI).then((response) => response.json())
    .then((jsonData) => {
      var complexionCombined = [];

      $('.tab-makeup-content > .tab-pane .owl-carousel').owlCarousel('destroy');
      $('.tab-makeup-content > .tab-pane .owl-carousel').html('');
      $('.tab-makeup-content > .tab-pane .tab-content').html('');
      $('.controls-color').fadeOut(200).remove();

      if (season === 'COOL SUMMER') {
        resultData = jsonData.season[2];
        complexionCombined = jsonData.complexion;
        $('.category-season-arrow').attr('data-season', 'COOL WINTER')
        renderComplexion(jsonData.complexion[0].item, complexionCombined)
        renderLightening(jsonData.complexion[0].item, complexionCombined)
      } else if (season === 'COOL WINTER') {
        resultData = jsonData.season[3];
        complexionCombined = jsonData.complexion;
        $('.category-season-arrow').attr('data-season', 'COOL SUMMER')
        renderComplexion(jsonData.complexion[8].item, complexionCombined)
        renderLightening(jsonData.complexion[8].item, complexionCombined)
      } else if (season === 'WARM SPRING') {
        resultData = jsonData.season[0];
        $('.category-season-arrow').attr('data-season', 'WARM AUTUMN')
        complexionCombined = jsonData.complexion;
        renderComplexion(jsonData.complexion[2].item.concat(jsonData.complexion[3].item, jsonData.complexion[5].item), complexionCombined)
        renderLightening(jsonData.complexion[2].item.concat(jsonData.complexion[3].item, jsonData.complexion[5].item), complexionCombined)
      } else if (season === 'WARM AUTUMN') {
        resultData = jsonData.season[1];
        $('.category-season-arrow').attr('data-season', 'WARM SPRING')
        complexionCombined = jsonData.complexion;
        renderComplexion(jsonData.complexion[4].item.concat(jsonData.complexion[6].item, jsonData.complexion[7].item), complexionCombined)
        renderLightening(jsonData.complexion[4].item.concat(jsonData.complexion[6].item, jsonData.complexion[7].item), complexionCombined)
      }

      renderLipstick(resultData.lips);
      renderEyeshadow(resultData.eyes)
      renderBlush(resultData.blushOn)

      setTimeout(function() {
        $('.tab-makeup-content > .tab-pane .owl-carousel').owlCarousel({
          loop: false,
          margin: 10,
          nav: true,
          dots: false,
          navText: ["<div class='tab-arrow prev'><img src='./assets/images/arrow-slider.png'></div>", "<div class='tab-arrow next'><img src='./assets/images/arrow-slider.png'></div>"],
          responsiveClass: true,
          responsive: {
            0: {
              items: 4,
              nav: true
            },
            1000: {
              items: 3,
              margin: 17,
            }
          }
        });

        // Only auto-select if all original URL parameters were provided
        if (urlParams.get('season') && urlParams.get('complexion') && urlParams.get('product') && urlParams.get('color')) {
          var idAutoSelect = $(`.controls-color.${product} a[style*="\\${color}"]`).eq(0).parents('.tab-pane').attr('id');
          $(`.tab-makeup .nav-link[href="#${product}"]`).click();
          $(`.controls-color.${product} a[style*="\\${color}"]`).eq(0).click();
          $(`.tab-makeup-content .nav-link[href="#${idAutoSelect}"]`).click();
        }

        $('.owl-carousel').css('opacity', '1');

        $(window).resize(function() {
          slideMoving($('.tab-makeup'), $('.tab-makeup .nav-item .nav-link.active'));
        }).resize();

      }, 500);

      $('.loader-2').fadeOut(200);
    }).catch((error) => console.error('Error fetching data:', error));
  }

  fetchProducts();

  $('.category-season-arrow').on('click', function() {
    season = $(this).data('season');
    $('.category-season-arrow').fadeIn(300);
    $(this).fadeOut(300);
    fetchProducts();
  })

  let initialWidth, initialMouseX, maxWidth, minWidth;

  // Mousedown and touchstart events
  $('.divider, img.arrow-divider').on('mousedown touchstart', function (e) {
    e.preventDefault();

    const containerWidth = $('.divider').parent('#webar_container').width();
    minWidth = 15; // Set a minimum width in pixels (e.g., 100px)
    maxWidth = containerWidth * 0.97; // 90% of the container's width

    // Handle touch events
    if (e.type === 'touchstart') {
      initialMouseX = e.touches[0].clientX;
    } else {
      initialMouseX = e.clientX;
    }

    initialWidth = $('.divider').width();

    // Bind the events for resizing
    $(document).on('mousemove touchmove', resizeElement);
    $(document).on('mouseup touchend', stopResize);
  });

  function resizeElement(e) {
    let currentX;

    // Handle touch events
    if (e.type === 'touchmove') {
      currentX = e.touches[0].clientX;
    } else {
      currentX = e.clientX;
    }

    let newWidth = initialWidth + (currentX - initialMouseX);

    // Restrict the width to the min and max values
    if (newWidth > maxWidth) {
      newWidth = maxWidth;
    } else if (newWidth < minWidth) {
      newWidth = minWidth;
    }

    $('.divider').css({
      width: newWidth + 'px',
    })
    $('img.arrow-divider').css({
      left: newWidth + 'px',
    });
  }


  function stopResize() {
    // Unbind the events for resizing
    $(document).off('mousemove touchmove', resizeElement);
    $(document).off('mouseup touchend', stopResize);
  }

  $(document).on('click', '.controls-color a', function () {
    var parentDataType = $(this).parent('.controls-color').data('type');
    var color = $(this).css('background-color');
    var bg = $(this).attr('data-bg');
    var type = $(this).data('type');

    if (parentDataType === 'lipstick') {
      if ($(this).hasClass('selected')) {
        lipstickMaterial.visible = false;
        lipstickGlossyMaterial.visible = false;
      } else {
        if (type === 'glossy') {
          lipstickMaterial.opacity = 0.38;
          lipstickGlossyMaterial.visible = true;
        } else if (type === 'matte') {
          lipstickMaterial.opacity = 0.57;
          lipstickGlossyMaterial.visible = false;
        } else {
          lipstickMaterial.opacity = 0.3;
          lipstickGlossyMaterial.visible = false;
        }
        changeTextureColor(lipstickTexture, color, lipstickMaterial);
      }
    }

    if (parentDataType === 'blush') {
      if ($(this).hasClass('selected')) {
        blushMaterial.visible = false;
      }else{
        if (type === 'creamy') {
          blushMaterial.opacity = 0.19;
        }else{
          blushMaterial.opacity = 0.17;
        }
        changeTextureColor(blushTexture, color, blushMaterial);
      }
    }

    if (parentDataType === 'eyeshadow') {
      if ($(this).hasClass('selected')) {
        eyeshadowMaterial.visible = false;
        eyeshadowGlitterMaterial.visible = false;
      } else {
        if (type === 'glitter') {
          eyeshadowMaterial.visible = false;
          changeTextureColor(eyeshadowGlitterTexture, color, eyeshadowGlitterMaterial);
        } else {
          eyeshadowGlitterMaterial.visible = false;
          eyeshadowMaterial.opacity = 0.23;
          changeTextureColor(eyeshadowTexture, color, eyeshadowMaterial);
        }
      }
    }

    if (parentDataType === 'foundation' || parentDataType === 'complexion') {
      if ($(this).hasClass('selected')) {
        changeTextureColor(fullFaceTexture, '#fff1e7', faceMaterial);
      } else {
        if (type === 'cushion') {
          faceMaterial.opacity = 0.17;
        }else if(type === 'feel'){
          faceMaterial.opacity = 0.175;
        }else if(type === 'concealer'){
          faceMaterial.opacity = 0.18;
        }else{
          faceMaterial.opacity = 0.16;
        }
        changeTextureColor(fullFaceTexture, bg, faceMaterial);
      }
    }

    $('.controls-color a').not($(this)).removeClass('selected');
    $(this).toggleClass('selected');
  });

  var isDragging = false;
  var startX, scrollLeft;

  $('.horizontal-swipe').on('mousedown touchstart', function (e) {
    isDragging = true;
    startX = e.pageX || e.originalEvent.touches[0].pageX;
    scrollLeft = $(this).scrollLeft();
  });

  $(document).on('mousemove touchmove', function (e) {
    if (!isDragging) return;
    var x = e.pageX || e.originalEvent.touches[0].pageX;
    var walk = (startX - x) * 2; // Multiplied by 2 for faster scroll
    $('.horizontal-swipe').scrollLeft(scrollLeft + walk);
  });

  $(document).on('mouseup touchend', function () {
    isDragging = false;
  });

  $(document).on('click', '.tab-makeup .nav-item .nav-link', function () {
    slideMoving($('.tab-makeup'), $('.tab-makeup .nav-item .nav-link.active'));
  });

  $(document).on('click', '.tab-makeup-content .nav-item .nav-link', function () {
    var tabTarget = $(this).attr('href');

    if($(`.tab-pane${tabTarget} .controlButton`).length === 1){
      $(`.tab-pane${tabTarget} .controlButton:first-child`).click();
    }
  });

  $(document).on('shown.bs.tab', '.tab-makeup .nav-item .nav-link', function () {
    $('.owl-carousel').owlCarousel({
      loop: false,
      margin: 10,
      nav: true,
      dots: false,
      responsiveClass: true,
      responsive: {
        0: {
          items: 5,
          nav: true
        },
        1000: {
          items: 4,
          margin: 17,
        }
      }
    });

    $('.owl-carousel').css('opacity', '1');
  });

  $(document).on('click', 'button, .btn, a', function() {
    clickSfx.play();
  })
});

function manualPost(path, params, method='post') {

  // The rest of this code assumes you are not using a library.
  // It can be made less verbose if you use one.
  const form = document.createElement('form');
  form.method = method;
  form.action = path;
  form.enctype = 'multipart/form-data';

  for (const key in params) {
    if (params.hasOwnProperty(key)) {
      const hiddenField = document.createElement('input');
      hiddenField.type = 'hidden';
      hiddenField.name = key;
      hiddenField.value = params[key];

      form.appendChild(hiddenField);
    }
  }

  document.body.appendChild(form);
  form.submit();
}
