"use strict";

let gl;
let canvas;
let program;

// Uniform locations
let mvpMatrixLoc;
let normalMatrixLoc;
let lightPositionLoc;
let ambientLightLoc;
let diffuseLightLoc;
let specularLightLoc;
let shininessLoc;
let enableLightingLoc;

// Attribute locations
let vPositionLoc;
let vColorLoc;
let vNormalLoc;

// Matrices
let projectionMatrix;
let viewMatrix;

// Animation/Control variables
let doorAngleLeft = 0;
let doorAngleRight = 0;
let leftHandleAngle = 0;
let rightHandleAngle = 0;
let leftGlassFrameAngle = 0;
let rightGlassFrameAngle = 0;
let rotationX = 0;
let rotationY = 0;
let rotationZ = 0;
let zoomDistance = 8;
let autoRotateEnabled = false;

// Push animation variables
let isPushAnimating = false;
let isCloseAnimating = false;
let pushAnimationProgress = 0;
let pushAnimationSpeed = 1.5;
let pushTargetAngle = 75;

// Glass window animation variables
let isGlassOpenAnimating = false;
let isGlassCloseAnimating = false;
let glassAnimationProgress = 0;
let glassAnimationSpeed = 1.5;
let glassTargetAngle = 15;

// Lighting parameters
let lightPosition = vec3(5.0, 5.0, 10.0);
let ambientLight = vec3(0.4, 0.4, 0.4);
let diffuseLight = vec3(0.6, 0.6, 0.6);
let specularLight = vec3(0.5, 0.5, 0.5);
let shininess = 32.0;
let lightingEnabled = true;

// Texture variables
let checkerboardTexture;
let imageTexture;
let enableTexture = false;
let textureMode = 0; // 0 = none, 1 = checkerboard, 2 = image

// Uniform locations
let texture1Loc;
let texture2Loc;
let enableTextureLoc;
let textureModeLoc;

// Geometry data storage
let doorGeometry = {
    outerFrame: [],
    innerFrame: [],
    leftDoor: [],
    rightDoor: [],
    leftHandle: [],
    rightHandle: [],
    leftDoorStrips: [],
    rightDoorStrips: [],
    outerGlassBoxes: [],
    outerGlassFrames: [],
    walls: []
};

// Dimensions
const OUTER_FRAME_THICKNESS = 0.4;
const FRAME_DEPTH = 0.15;
const TOTAL_WIDTH = 3.5;
const TOTAL_HEIGHT = 4.0;

const INNER_WIDTH = TOTAL_WIDTH - (OUTER_FRAME_THICKNESS * 2);

const DOOR_WIDTH = INNER_WIDTH / 2;
const DOOR_HEIGHT = TOTAL_HEIGHT - (OUTER_FRAME_THICKNESS)
const DOOR_THICKNESS = 0.05;

const HANDLE_WIDTH = 0.08;
const HANDLE_HEIGHT = 0.5;
const HANDLE_DEPTH = 0.08;

const doorCenterY = -OUTER_FRAME_THICKNESS / 2.0;
const doorOffset = 0.165

window.onload = function init() {
    canvas = document.getElementById("gl-canvas");

    gl = canvas.getContext("webgl");
    if (!gl) {
        console.error("WebGL isn't available");
        alert("WebGL isn't available");
        return;
    }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.15, 0.15, 0.15, 1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    program = initShaders(gl, "vertex-shader", "fragment-shader");
    if (!program) {
        console.error("Failed to initialize shaders");
        return;
    }
    gl.useProgram(program);

    vPositionLoc = gl.getAttribLocation(program, "vPosition");
    vColorLoc = gl.getAttribLocation(program, "vColor");
    vNormalLoc = gl.getAttribLocation(program, "vNormal");

    mvpMatrixLoc = gl.getUniformLocation(program, "modelViewProjectionMatrix");
    normalMatrixLoc = gl.getUniformLocation(program, "normalMatrix");
    lightPositionLoc = gl.getUniformLocation(program, "lightPosition");
    ambientLightLoc = gl.getUniformLocation(program, "ambientLight");
    diffuseLightLoc = gl.getUniformLocation(program, "diffuseLight");
    specularLightLoc = gl.getUniformLocation(program, "specularLight");
    shininessLoc = gl.getUniformLocation(program, "shininess");
    enableLightingLoc = gl.getUniformLocation(program, "enableLighting");

    initGeometry();

    texture1Loc = gl.getUniformLocation(program, "texture1");
    texture2Loc = gl.getUniformLocation(program, "texture2");
    enableTextureLoc = gl.getUniformLocation(program, "enableTexture");
    textureModeLoc = gl.getUniformLocation(program, "textureMode");

    loadTextures();

    projectionMatrix = perspective(45.0, canvas.width / canvas.height, 0.1, 100.0);

    setupEventListeners();

    animate();
};

function setupEventListeners() {
    // Left Door angle
    const doorAngleLeftSlider = document.getElementById("leftDoorAngle");
    const leftAngleValueSpan = document.getElementById("leftDoorValue");
    doorAngleLeftSlider.addEventListener("input", function () {
        doorAngleLeft = parseFloat(this.value);
        leftAngleValueSpan.textContent = `${doorAngleLeft.toFixed(0)}°`;
    });

    // Right Door angle
    const doorAngleRightSlider = document.getElementById("rightDoorAngle");
    const rightAngleValueSpan = document.getElementById("rightAngleValue");
    doorAngleRightSlider.addEventListener("input", function () {
        doorAngleRight = parseFloat(this.value);
        rightAngleValueSpan.textContent = `${doorAngleRight.toFixed(0)}°`;
    });

    // Left handle angle
    const leftHandleSlider = document.getElementById("leftHandleAngle");
    const leftHandleValueSpan = document.getElementById("leftHandleValue");
    leftHandleSlider.addEventListener("input", function () {
        leftHandleAngle = parseFloat(this.value);
        leftHandleValueSpan.textContent = `${leftHandleAngle.toFixed(0)}°`;
    });

    // Right handle angle
    const rightHandleSlider = document.getElementById("rightHandleAngle");
    const rightHandleValueSpan = document.getElementById("rightHandleValue");
    rightHandleSlider.addEventListener("input", function () {
        rightHandleAngle = parseFloat(this.value);
        rightHandleValueSpan.textContent = `${rightHandleAngle.toFixed(0)}°`;
    });

    // Left glass frame angle
    const leftGlassFrameSlider = document.getElementById("leftGlassFrameAngle");
    const leftGlassFrameValueSpan = document.getElementById("leftGlassFrameValue");
    leftGlassFrameSlider.addEventListener("input", function () {
        leftGlassFrameAngle = parseFloat(this.value);
        leftGlassFrameValueSpan.textContent = `${leftGlassFrameAngle.toFixed(0)}°`;
    });

    // Right glass frame angle
    const rightGlassFrameSlider = document.getElementById("rightGlassFrameAngle");
    const rightGlassFrameValueSpan = document.getElementById("rightGlassFrameValue");
    rightGlassFrameSlider.addEventListener("input", function () {
        rightGlassFrameAngle = parseFloat(this.value);
        rightGlassFrameValueSpan.textContent = `${rightGlassFrameAngle.toFixed(0)}°`;
    });

    document.getElementById("enableTexture").addEventListener("change", function () {
        enableTexture = this.checked;
    });

    document.getElementById("textureMode").addEventListener("change", function () {
        textureMode = parseInt(this.value);
    });

    setupSlider("rotateX", "rotateXValue", (val) => { rotationX = val; }, "°");
    setupSlider("rotateY", "rotateYValue", (val) => { rotationY = val; }, "°");
    setupSlider("rotateZ", "rotateZValue", (val) => { rotationZ = val; }, "°");
    setupSlider("zoom", "zoomValue", (val) => { zoomDistance = val; }, "");

    document.getElementById("enableLighting").addEventListener("change", function () {
        lightingEnabled = this.checked;
    });

    setupSlider("lightPosX", "lightPosXValue", (val) => { lightPosition[0] = val; }, "");
    setupSlider("lightPosY", "lightPosYValue", (val) => { lightPosition[1] = val; }, "");
    setupSlider("lightPosZ", "lightPosZValue", (val) => { lightPosition[2] = val; }, "");

    setupSlider("ambientR", "ambientRValue", (val) => { ambientLight[0] = val; }, "");
    setupSlider("ambientG", "ambientGValue", (val) => { ambientLight[1] = val; }, "");
    setupSlider("ambientB", "ambientBValue", (val) => { ambientLight[2] = val; }, "");

    setupSlider("diffuseR", "diffuseRValue", (val) => { diffuseLight[0] = val; }, "");
    setupSlider("diffuseG", "diffuseGValue", (val) => { diffuseLight[1] = val; }, "");
    setupSlider("diffuseB", "diffuseBValue", (val) => { diffuseLight[2] = val; }, "");

    setupSlider("specularR", "specularRValue", (val) => { specularLight[0] = val; }, "");
    setupSlider("specularG", "specularGValue", (val) => { specularLight[1] = val; }, "");
    setupSlider("specularB", "specularBValue", (val) => { specularLight[2] = val; }, "");

    setupSlider("shininess", "shininessValue", (val) => { shininess = val; }, "");
}

function setupSlider(sliderId, valueId, callback, suffix) {
    const slider = document.getElementById(sliderId);
    const valueSpan = document.getElementById(valueId);
    slider.addEventListener("input", function () {
        const val = parseFloat(this.value);
        callback(val);
        valueSpan.textContent = val.toFixed(1) + suffix;
    });
}

function loadTextures() {
    // Checkerboard texture
    checkerboardTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, checkerboardTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    const size = 256;
    const data = new Uint8Array(size * size * 4);
    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            const idx = (i * size + j) * 4;
            const checker = ((i >> 4) + (j >> 4)) % 2;
            data[idx] = checker * 255;     // R
            data[idx + 1] = checker * 255; // G
            data[idx + 2] = checker * 255; // B
            data[idx + 3] = 255;           // A
        }
    }
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);

    // Image texture
    imageTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, imageTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    const image = new Image();
    image.onload = function () {
        gl.bindTexture(gl.TEXTURE_2D, imageTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    };
    image.src = "door.png";
}

function viewFront() {
    rotationX = 0; rotationY = 0; rotationZ = 0;
    updateSliders();
}

function viewBack() {
    rotationX = 0; rotationY = 180; rotationZ = 0;
    updateSliders();
}

function viewTop() {
    rotationX = -90; rotationY = 0; rotationZ = 0;
    updateSliders();
}

function viewBottom() {
    rotationX = 90; rotationY = 0; rotationZ = 0;
    updateSliders();
}

function viewLeft() {
    rotationX = 0; rotationY = -90; rotationZ = 0;
    updateSliders();
}

function viewRight() {
    rotationX = 0; rotationY = 90; rotationZ = 0;
    updateSliders();
}

function resetView() {
    rotationX = 0; rotationY = 0; rotationZ = 0;
    zoomDistance = 8;
    autoRotateEnabled = false;
    updateSliders();
}

function toggleAutoRotate() {
    autoRotateEnabled = !autoRotateEnabled;
}

function resetLighting() {
    lightPosition = vec3(5.0, 5.0, 10.0);
    ambientLight = vec3(0.4, 0.4, 0.4);
    diffuseLight = vec3(0.6, 0.6, 0.6);
    specularLight = vec3(0.5, 0.5, 0.5);
    shininess = 32.0;
    lightingEnabled = true;

    document.getElementById("lightPosX").value = 5.0;
    document.getElementById("lightPosY").value = 5.0;
    document.getElementById("lightPosZ").value = 10.0;
    document.getElementById("ambientR").value = 0.4;
    document.getElementById("ambientG").value = 0.4;
    document.getElementById("ambientB").value = 0.4;
    document.getElementById("diffuseR").value = 0.6;
    document.getElementById("diffuseG").value = 0.6;
    document.getElementById("diffuseB").value = 0.6;
    document.getElementById("specularR").value = 0.5;
    document.getElementById("specularG").value = 0.5;
    document.getElementById("specularB").value = 0.5;
    document.getElementById("shininess").value = 32;
    document.getElementById("enableLighting").checked = true;

    updateSliderValues();
}

function updateSliders() {
    document.getElementById("rotateX").value = rotationX;
    document.getElementById("rotateY").value = rotationY;
    document.getElementById("rotateZ").value = rotationZ;
    document.getElementById("zoom").value = zoomDistance;
    updateSliderValues();
}

function updateSliderValues() {
    document.getElementById("rotateXValue").textContent = rotationX.toFixed(1) + "°";
    document.getElementById("rotateYValue").textContent = rotationY.toFixed(1) + "°";
    document.getElementById("rotateZValue").textContent = rotationZ.toFixed(1) + "°";
    document.getElementById("zoomValue").textContent = zoomDistance.toFixed(1);

    document.getElementById("lightPosXValue").textContent = lightPosition[0].toFixed(1);
    document.getElementById("lightPosYValue").textContent = lightPosition[1].toFixed(1);
    document.getElementById("lightPosZValue").textContent = lightPosition[2].toFixed(1);

    document.getElementById("ambientRValue").textContent = ambientLight[0].toFixed(2);
    document.getElementById("ambientGValue").textContent = ambientLight[1].toFixed(2);
    document.getElementById("ambientBValue").textContent = ambientLight[2].toFixed(2);

    document.getElementById("diffuseRValue").textContent = diffuseLight[0].toFixed(2);
    document.getElementById("diffuseGValue").textContent = diffuseLight[1].toFixed(2);
    document.getElementById("diffuseBValue").textContent = diffuseLight[2].toFixed(2);

    document.getElementById("specularRValue").textContent = specularLight[0].toFixed(2);
    document.getElementById("specularGValue").textContent = specularLight[1].toFixed(2);
    document.getElementById("specularBValue").textContent = specularLight[2].toFixed(2);

    document.getElementById("shininessValue").textContent = shininess.toFixed(0);
}

// Helper function to create box geometry with normals
function createBox(width, height, depth, color) {
    const w = width / 2, h = height / 2, d = depth / 2;

    const positions = [
        // Front face
        vec3(-w, -h, d), vec3(w, -h, d), vec3(w, h, d), vec3(-w, h, d),
        // Back face
        vec3(-w, -h, -d), vec3(-w, h, -d), vec3(w, h, -d), vec3(w, -h, -d),
        // Top face
        vec3(-w, h, -d), vec3(-w, h, d), vec3(w, h, d), vec3(w, h, -d),
        // Bottom face
        vec3(-w, -h, -d), vec3(w, -h, -d), vec3(w, -h, d), vec3(-w, -h, d),
        // Right face
        vec3(w, -h, -d), vec3(w, h, -d), vec3(w, h, d), vec3(w, -h, d),
        // Left face
        vec3(-w, -h, -d), vec3(-w, -h, d), vec3(-w, h, d), vec3(-w, h, -d)
    ];

    const normals = [
        // Front
        vec3(0, 0, 1), vec3(0, 0, 1), vec3(0, 0, 1), vec3(0, 0, 1),
        // Back
        vec3(0, 0, -1), vec3(0, 0, -1), vec3(0, 0, -1), vec3(0, 0, -1),
        // Top
        vec3(0, 1, 0), vec3(0, 1, 0), vec3(0, 1, 0), vec3(0, 1, 0),
        // Bottom
        vec3(0, -1, 0), vec3(0, -1, 0), vec3(0, -1, 0), vec3(0, -1, 0),
        // Right
        vec3(1, 0, 0), vec3(1, 0, 0), vec3(1, 0, 0), vec3(1, 0, 0),
        // Left
        vec3(-1, 0, 0), vec3(-1, 0, 0), vec3(-1, 0, 0), vec3(-1, 0, 0)
    ];

    const texCoords = [
        // Front
        vec2(0, 0), vec2(1, 0), vec2(1, 1), vec2(0, 1),
        // Back
        vec2(0, 0), vec2(1, 0), vec2(1, 1), vec2(0, 1),
        // Top
        vec2(0, 0), vec2(1, 0), vec2(1, 1), vec2(0, 1),
        // Bottom
        vec2(0, 0), vec2(1, 0), vec2(1, 1), vec2(0, 1),
        // Right
        vec2(0, 0), vec2(1, 0), vec2(1, 1), vec2(0, 1),
        // Left
        vec2(0, 0), vec2(1, 0), vec2(1, 1), vec2(0, 1)
    ];

    const colors = [];
    for (let i = 0; i < 24; i++) {
        colors.push(vec4(color[0], color[1], color[2], color[3]));
    }

    const indices = [
        0, 1, 2, 0, 2, 3,    // Front
        4, 5, 6, 4, 6, 7,    // Back
        8, 9, 10, 8, 10, 11,  // Top
        12, 13, 14, 12, 14, 15, // Bottom
        16, 17, 18, 16, 18, 19, // Right
        20, 21, 22, 20, 22, 23  // Left
    ];

    return { positions, normals, colors, texCoords, indices };
}

function initGeometry() {
    // Colors
    const orangeColor = [1.0, 0.45, 0.35, 1.0];
    const glassColor = [0.45, 0.55, 0.6, 0.85];
    const handleColor = [0.95, 0.95, 0.95, 1.0];
    const stripColor = [0.3, 0.4, 0.45, 0.9];
    const whiteColor = [1.0, 1.0, 1.0, 1.0];
    const wallColor = [0.8, 0.8, 0.8, 1.0];

    // === OUTER FRAME (Orange) ===
    doorGeometry.outerFrame.push({
        geometry: createBox(TOTAL_WIDTH, OUTER_FRAME_THICKNESS, FRAME_DEPTH, orangeColor),
        transform: translate(0, TOTAL_HEIGHT / 2 - OUTER_FRAME_THICKNESS / 2, 0)
    });
    doorGeometry.outerFrame.push({
        geometry: createBox(OUTER_FRAME_THICKNESS, TOTAL_HEIGHT, FRAME_DEPTH, orangeColor),
        transform: translate(-TOTAL_WIDTH / 2 + OUTER_FRAME_THICKNESS / 2, 0, 0)
    });
    doorGeometry.outerFrame.push({
        geometry: createBox(OUTER_FRAME_THICKNESS, TOTAL_HEIGHT, FRAME_DEPTH, orangeColor),
        transform: translate(TOTAL_WIDTH / 2 - OUTER_FRAME_THICKNESS / 2, 0, 0)
    });

    // === OUTER GLASS FRAME ===
    const glassOffset = 0.01;
    const glassDepth = FRAME_DEPTH * 0.2;

    doorGeometry.outerGlassBoxes.push({
        geometry: createBox(OUTER_FRAME_THICKNESS, TOTAL_HEIGHT, DOOR_THICKNESS, glassColor),
        transform: translate(-TOTAL_WIDTH / 2 - OUTER_FRAME_THICKNESS / 2 - glassOffset, 0, glassDepth)
    });
    doorGeometry.outerGlassBoxes.push({
        geometry: createBox(OUTER_FRAME_THICKNESS, TOTAL_HEIGHT, DOOR_THICKNESS, glassColor),
        transform: translate(TOTAL_WIDTH / 2 + OUTER_FRAME_THICKNESS / 2 + glassOffset, 0, glassDepth)
    });
    doorGeometry.outerGlassBoxes.push({
        geometry: createBox(TOTAL_WIDTH + (OUTER_FRAME_THICKNESS) * 2, OUTER_FRAME_THICKNESS, DOOR_THICKNESS, glassColor),
        transform: translate(0, TOTAL_HEIGHT / 2 + OUTER_FRAME_THICKNESS / 2 + glassOffset, glassDepth)
    });
    doorGeometry.outerGlassBoxes.push({
        geometry: createBox(OUTER_FRAME_THICKNESS, OUTER_FRAME_THICKNESS, DOOR_THICKNESS, glassColor),
        transform: translate(-TOTAL_WIDTH / 2 - OUTER_FRAME_THICKNESS / 2 - glassOffset, TOTAL_HEIGHT / 2 + OUTER_FRAME_THICKNESS / 2 + glassOffset, glassDepth)
    });
    doorGeometry.outerGlassBoxes.push({
        geometry: createBox(OUTER_FRAME_THICKNESS, OUTER_FRAME_THICKNESS, DOOR_THICKNESS, glassColor),
        transform: translate(TOTAL_WIDTH / 2 + OUTER_FRAME_THICKNESS / 2 + glassOffset, TOTAL_HEIGHT / 2 + OUTER_FRAME_THICKNESS / 2 + glassOffset, glassDepth)
    });

    // === OUTER GLASS FRAMES (Bingkai Putih) ===
    doorGeometry.outerGlassBoxes.forEach(item => {
        const geom = item.geometry;
        const trans = item.transform;

        // Ekstrak dimensi dari geometry
        const w = geom.positions[1][0] - geom.positions[0][0]; // width
        const h = geom.positions[3][1] - geom.positions[0][1]; // height
        const d = geom.positions[0][2] - geom.positions[4][2]; // depth

        // Ekstrak posisi dari transform (translate matrix)
        const tx = trans[0][3];
        const ty = trans[1][3];
        const tz = trans[2][3];

        doorGeometry.outerGlassFrames.push({
            geometry: createBox(w, 0.02, d, whiteColor),
            transform: translate(tx, ty + h / 2 + 0.01, tz)
        });
        doorGeometry.outerGlassFrames.push({
            geometry: createBox(w, 0.02, d, whiteColor),
            transform: translate(tx, ty - h / 2 - 0.01, tz)
        });
        doorGeometry.outerGlassFrames.push({
            geometry: createBox(0.02, h, d, whiteColor),
            transform: translate(tx - w / 2 - 0.01, ty, tz)
        });
        doorGeometry.outerGlassFrames.push({
            geometry: createBox(0.02, h, d, whiteColor),
            transform: translate(tx + w / 2 + 0.01, ty, tz)
        });
    });

    // === LEFT DOOR ===
    doorGeometry.leftDoor.push({
        geometry: createBox(DOOR_WIDTH, DOOR_HEIGHT, DOOR_THICKNESS, glassColor),
        transform: translate(DOOR_WIDTH / 2, doorCenterY, FRAME_DEPTH * 0.2)
    });
    doorGeometry.leftHandle.push({
        geometry: createBox(HANDLE_WIDTH, HANDLE_HEIGHT, HANDLE_DEPTH, handleColor),
        transform: translate(DOOR_WIDTH - 0.25, doorCenterY, FRAME_DEPTH * 0.25 + DOOR_THICKNESS / 2)
    });

    // === LEFT DOOR STRIPS ===
    const stripHeights = [0.2, 0.1, 1, 0.1, 0.2];
    const stripDepth = DOOR_THICKNESS + 0.002;
    const numStrips = 5;

    const gapBetweenStrips = 0.05;
    const totalStripHeight = stripHeights.reduce((sum, h) => sum + h, 0);
    const totalGaps = (numStrips - 1) * gapBetweenStrips;
    const totalOccupiedHeight = totalStripHeight + totalGaps;

    const startY = doorCenterY - (DOOR_HEIGHT / 2) + (DOOR_HEIGHT - totalOccupiedHeight) / 2;

    let currentY = startY;

    for (let i = 0; i < numStrips; i++) {
        const stripHeight = stripHeights[i];
        const stripY = currentY + stripHeight / 2;

        doorGeometry.leftDoorStrips.push({
            geometry: createBox(DOOR_WIDTH, stripHeight, stripDepth, stripColor),
            transform: translate(DOOR_WIDTH / 2, stripY, FRAME_DEPTH * 0.2)
        });

        currentY += stripHeight + gapBetweenStrips;
    }

    // === RIGHT DOOR ===
    doorGeometry.rightDoor.push({
        geometry: createBox(DOOR_WIDTH, DOOR_HEIGHT, DOOR_THICKNESS, glassColor),
        transform: translate(-DOOR_WIDTH / 2, doorCenterY, FRAME_DEPTH * 0.2)
    });
    doorGeometry.rightHandle.push({
        geometry: createBox(HANDLE_WIDTH, HANDLE_HEIGHT, HANDLE_DEPTH, handleColor),
        transform: translate(-DOOR_WIDTH + 0.25, doorCenterY, FRAME_DEPTH * 0.25 + DOOR_THICKNESS / 2)
    });

    // === RIGHT DOOR STRIPS ===
    currentY = startY;
    for (let i = 0; i < numStrips; i++) {
        const stripHeight = stripHeights[i];
        const stripY = currentY + stripHeight / 2;

        doorGeometry.rightDoorStrips.push({
            geometry: createBox(DOOR_WIDTH, stripHeight, stripDepth, stripColor),
            transform: translate(-DOOR_WIDTH / 2, stripY, FRAME_DEPTH * 0.2)
        });

        currentY += stripHeight + gapBetweenStrips;
    }

    doorGeometry.rightHandle.push({
        geometry: createBox(HANDLE_WIDTH, HANDLE_HEIGHT, HANDLE_DEPTH, handleColor),
        transform: translate(-DOOR_WIDTH + 0.25, doorCenterY, FRAME_DEPTH * 0.25 + DOOR_THICKNESS / 2)
    });

    // === WALLS ===
    const wallWidth = 2.0;
    const wallWidthLeft = wallWidth * 3;
    const extraWallHeight = 0.5;
    const wallHeight = TOTAL_HEIGHT + extraWallHeight

    doorGeometry.walls.push({
        geometry: createBox(wallWidthLeft, wallHeight, FRAME_DEPTH, wallColor),
        transform: translate(-TOTAL_WIDTH / 2 - OUTER_FRAME_THICKNESS - wallWidthLeft / 2, extraWallHeight / 2, 0)
    });
    doorGeometry.walls.push({
        geometry: createBox(wallWidth, wallHeight, FRAME_DEPTH, wallColor),
        transform: translate(TOTAL_WIDTH / 2 + OUTER_FRAME_THICKNESS + wallWidth / 2, extraWallHeight / 2, 0)
    });
}

function drawGeometry(geometryList, parentTransform) {
    geometryList.forEach(item => {
        const { geometry, transform } = item;
        let modelMatrix = mult(parentTransform, transform);

        const posBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(geometry.positions), gl.STATIC_DRAW);
        gl.vertexAttribPointer(vPositionLoc, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(vPositionLoc);

        const normalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(geometry.normals), gl.STATIC_DRAW);
        gl.vertexAttribPointer(vNormalLoc, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(vNormalLoc);

        const colorBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(geometry.colors), gl.STATIC_DRAW);
        gl.vertexAttribPointer(vColorLoc, 4, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(vColorLoc);

        const indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(geometry.indices), gl.STATIC_DRAW);

        const texCoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(geometry.texCoords), gl.STATIC_DRAW);
        const vTexCoordLoc = gl.getAttribLocation(program, "vTexCoord");
        gl.vertexAttribPointer(vTexCoordLoc, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(vTexCoordLoc);

        let mvMatrix = mult(viewMatrix, modelMatrix);
        let mvpMatrix = mult(projectionMatrix, mvMatrix);

        gl.uniformMatrix4fv(mvpMatrixLoc, false, flatten(mvpMatrix));
        gl.uniformMatrix4fv(normalMatrixLoc, false, flatten(mvMatrix));

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, checkerboardTexture);
        gl.uniform1i(texture1Loc, 0);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, imageTexture);
        gl.uniform1i(texture2Loc, 1);

        gl.uniform1i(enableTextureLoc, enableTexture);
        gl.uniform1i(textureModeLoc, textureMode);

        gl.drawElements(gl.TRIANGLES, geometry.indices.length, gl.UNSIGNED_SHORT, 0);
    });
}

function animate() {
    // Auto-rotate if enabled
    if (autoRotateEnabled) {
        rotationY = (rotationY + 0.5) % 360;
        document.getElementById("rotateY").value = rotationY;
        document.getElementById("rotateYValue").textContent = rotationY.toFixed(1) + "°";
    }

    // Push animation (opening doors)
    if (isPushAnimating) {
        pushAnimationProgress += pushAnimationSpeed;

        // Ease in-out function for smooth animation
        let t = pushAnimationProgress / 100;
        let easeT = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

        doorAngleLeft = easeT * pushTargetAngle;
        doorAngleRight = easeT * pushTargetAngle;

        // Update sliders
        document.getElementById("leftDoorAngle").value = doorAngleLeft;
        document.getElementById("rightDoorAngle").value = doorAngleRight;
        document.getElementById("leftDoorValue").textContent = doorAngleLeft.toFixed(0) + "°";
        document.getElementById("rightDoorValue").textContent = doorAngleRight.toFixed(0) + "°";

        // Stop animation when complete
        if (pushAnimationProgress >= 100) {
            isPushAnimating = false;
            pushAnimationProgress = 0;
        }
    }

    // Close animation (closing doors)
    if (isCloseAnimating) {
        pushAnimationProgress += pushAnimationSpeed;

        // Ease in-out function for smooth animation
        let t = pushAnimationProgress / 100;
        let easeT = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

        // Animate from current angle to 0
        doorAngleLeft = pushTargetAngle * (1 - easeT);
        doorAngleRight = pushTargetAngle * (1 - easeT);

        // Update sliders
        document.getElementById("leftDoorAngle").value = doorAngleLeft;
        document.getElementById("rightDoorAngle").value = doorAngleRight;
        document.getElementById("leftDoorValue").textContent = doorAngleLeft.toFixed(0) + "°";
        document.getElementById("rightDoorValue").textContent = doorAngleRight.toFixed(0) + "°";

        // Stop animation when complete
        if (pushAnimationProgress >= 100) {
            isCloseAnimating = false;
            pushAnimationProgress = 0;
            doorAngleLeft = 0;
            doorAngleRight = 0;
            document.getElementById("leftDoorAngle").value = 0;
            document.getElementById("rightDoorAngle").value = 0;
            document.getElementById("leftDoorValue").textContent = "0°";
            document.getElementById("rightDoorValue").textContent = "0°";
        }
    }

    // Glass window open animation
    if (isGlassOpenAnimating) {
        glassAnimationProgress += glassAnimationSpeed;

        let t = glassAnimationProgress / 100;
        let easeT = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

        leftGlassFrameAngle = easeT * glassTargetAngle;
        rightGlassFrameAngle = easeT * glassTargetAngle;

        // Update sliders
        document.getElementById("leftGlassFrameAngle").value = leftGlassFrameAngle;
        document.getElementById("rightGlassFrameAngle").value = rightGlassFrameAngle;
        document.getElementById("leftGlassFrameValue").textContent = leftGlassFrameAngle.toFixed(0) + "°";
        document.getElementById("rightGlassFrameValue").textContent = rightGlassFrameAngle.toFixed(0) + "°";

        if (glassAnimationProgress >= 100) {
            isGlassOpenAnimating = false;
            glassAnimationProgress = 0;
        }
    }

    // Glass window close animation
    if (isGlassCloseAnimating) {
        glassAnimationProgress += glassAnimationSpeed;

        let t = glassAnimationProgress / 100;
        let easeT = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

        leftGlassFrameAngle = glassTargetAngle * (1 - easeT);
        rightGlassFrameAngle = glassTargetAngle * (1 - easeT);

        // Update sliders
        document.getElementById("leftGlassFrameAngle").value = leftGlassFrameAngle;
        document.getElementById("rightGlassFrameAngle").value = rightGlassFrameAngle;
        document.getElementById("leftGlassFrameValue").textContent = leftGlassFrameAngle.toFixed(0) + "°";
        document.getElementById("rightGlassFrameValue").textContent = rightGlassFrameAngle.toFixed(0) + "°";

        if (glassAnimationProgress >= 100) {
            isGlassCloseAnimating = false;
            glassAnimationProgress = 0;
            leftGlassFrameAngle = 0;
            rightGlassFrameAngle = 0;
            document.getElementById("leftGlassFrameAngle").value = 0;
            document.getElementById("rightGlassFrameAngle").value = 0;
            document.getElementById("leftGlassFrameValue").textContent = "0°";
            document.getElementById("rightGlassFrameValue").textContent = "0°";
        }
    }

    render();
    requestAnimationFrame(animate);
}

function startPushAnimation() {
    if (!isCloseAnimating) {  // Prevent starting if already closing
        isPushAnimating = true;
        isCloseAnimating = false;
        pushAnimationProgress = 0;
    }
}

function closeDoors() {
    if (!isPushAnimating) {  // Prevent starting if already opening
        isCloseAnimating = true;
        isPushAnimating = false;
        pushAnimationProgress = 0;
    }
}

function openGlassWindows() {
    if (!isGlassCloseAnimating) {
        isGlassOpenAnimating = true;
        isGlassCloseAnimating = false;
        glassAnimationProgress = 0;
    }
}

function closeGlassWindows() {
    if (!isGlassOpenAnimating) {
        isGlassCloseAnimating = true;
        isGlassOpenAnimating = false;
        glassAnimationProgress = 0;
    }
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Update lighting uniforms
    gl.uniform3fv(lightPositionLoc, flatten([lightPosition]));
    gl.uniform3fv(ambientLightLoc, flatten([ambientLight]));
    gl.uniform3fv(diffuseLightLoc, flatten([diffuseLight]));
    gl.uniform3fv(specularLightLoc, flatten([specularLight]));
    gl.uniform1f(shininessLoc, shininess);
    gl.uniform1i(enableLightingLoc, lightingEnabled ? 1 : 0);

    // Create view matrix with rotation and zoom
    let eye = vec3(0, 0, zoomDistance);
    let at = vec3(0, 0, 0);
    let up = vec3(0, 1, 0);
    viewMatrix = lookAt(eye, at, up);

    // Apply rotations
    viewMatrix = mult(viewMatrix, rotate(rotationX, vec3(1, 0, 0)));
    viewMatrix = mult(viewMatrix, rotate(rotationY, vec3(0, 1, 0)));
    viewMatrix = mult(viewMatrix, rotate(rotationZ, vec3(0, 0, 1)));

    const OUTER_FRAME_THICKNESS = 0.25;
    const TOTAL_WIDTH = 3.5;
    const INNER_WIDTH = TOTAL_WIDTH - (OUTER_FRAME_THICKNESS * 2);

    let transparentObjects = [];

    // Draw opaque objects
    drawGeometry(doorGeometry.outerFrame, mat4());
    drawGeometry(doorGeometry.outerGlassFrames, mat4());
    drawGeometry(doorGeometry.walls, mat4());

    const leftGlassHingeY = TOTAL_HEIGHT / 2 + OUTER_FRAME_THICKNESS / 2 + 0.01;
    const leftGlassX = -TOTAL_WIDTH / 2 - OUTER_FRAME_THICKNESS / 2 - 0.01;
    let leftGlassMatrix = translate(leftGlassX, leftGlassHingeY, 0);
    leftGlassMatrix = mult(leftGlassMatrix, rotate(leftGlassFrameAngle, vec3(1, 0, 0)));
    leftGlassMatrix = mult(leftGlassMatrix, translate(-leftGlassX, -leftGlassHingeY, 0));

    const rightGlassX = TOTAL_WIDTH / 2 + OUTER_FRAME_THICKNESS / 2 + 0.01;
    let rightGlassMatrix = translate(rightGlassX, leftGlassHingeY, 0);
    rightGlassMatrix = mult(rightGlassMatrix, rotate(rightGlassFrameAngle, vec3(1, 0, 0)));
    rightGlassMatrix = mult(rightGlassMatrix, translate(-rightGlassX, -leftGlassHingeY, 0));

    if (doorGeometry.outerGlassBoxes.length > 0) {
        transparentObjects.push({
            geometry: [doorGeometry.outerGlassBoxes[0]],
            transform: leftGlassMatrix
        });

        transparentObjects.push({
            geometry: [
                doorGeometry.outerGlassFrames[0],
                doorGeometry.outerGlassFrames[1],
                doorGeometry.outerGlassFrames[2],
                doorGeometry.outerGlassFrames[3]
            ],
            transform: leftGlassMatrix
        });
    }

    if (doorGeometry.outerGlassBoxes.length > 1) {
        transparentObjects.push({
            geometry: [doorGeometry.outerGlassBoxes[1]],
            transform: rightGlassMatrix
        });

        transparentObjects.push({
            geometry: [
                doorGeometry.outerGlassFrames[4],
                doorGeometry.outerGlassFrames[5],
                doorGeometry.outerGlassFrames[6],
                doorGeometry.outerGlassFrames[7]
            ],
            transform: rightGlassMatrix
        });
    }

    if (doorGeometry.outerGlassBoxes.length > 2) {
        transparentObjects.push({
            geometry: doorGeometry.outerGlassBoxes.slice(2),
            transform: mat4()
        });

        transparentObjects.push({
            geometry: doorGeometry.outerGlassFrames.slice(8),
            transform: mat4()
        });
    }

    // Left door hierarchy - ANIMATION LOGIC UNCHANGED
    const leftHingeX = -INNER_WIDTH / 2 + doorOffset;
    let leftHingeMatrix = translate(leftHingeX, 0, 0);
    leftHingeMatrix = mult(leftHingeMatrix, rotate(doorAngleLeft, vec3(0, 1, 0)));

    const leftHandlePosX = DOOR_WIDTH - 0.25;
    const leftHandlePosZ = FRAME_DEPTH * 0.25 + DOOR_THICKNESS / 2;

    const handleRotationOffsetY = -0.15;

    let leftHandleMatrix = leftHingeMatrix;
    leftHandleMatrix = mult(leftHandleMatrix, translate(leftHandlePosX, doorCenterY, leftHandlePosZ));
    leftHandleMatrix = mult(leftHandleMatrix, translate(0, handleRotationOffsetY, 0));
    leftHandleMatrix = mult(leftHandleMatrix, rotate(leftHandleAngle, vec3(0, 0, 1)));
    leftHandleMatrix = mult(leftHandleMatrix, translate(0, -handleRotationOffsetY, 0));

    doorGeometry.leftHandle.forEach(item => {
        drawGeometry([{
            geometry: item.geometry,
            transform: mat4()
        }], leftHandleMatrix);
    });

    transparentObjects.push({
        geometry: doorGeometry.leftDoor,
        transform: leftHingeMatrix
    });

    transparentObjects.push({
        geometry: doorGeometry.leftDoorStrips,
        transform: leftHingeMatrix
    });

    // Right door hierarchy - ANIMATION LOGIC UNCHANGED
    const rightHingeX = INNER_WIDTH / 2 - doorOffset;
    let rightHingeMatrix = translate(rightHingeX, 0, 0);
    rightHingeMatrix = mult(rightHingeMatrix, rotate(-doorAngleRight, vec3(0, 1, 0)));

    const rightHandlePosX = -DOOR_WIDTH + 0.25;
    const rightHandlePosZ = FRAME_DEPTH * 0.25 + DOOR_THICKNESS / 2;

    let rightHandleMatrix = rightHingeMatrix;
    rightHandleMatrix = mult(rightHandleMatrix, translate(rightHandlePosX, doorCenterY, rightHandlePosZ));
    rightHandleMatrix = mult(rightHandleMatrix, translate(0, handleRotationOffsetY, 0));
    rightHandleMatrix = mult(rightHandleMatrix, rotate(rightHandleAngle, vec3(0, 0, 1)));
    rightHandleMatrix = mult(rightHandleMatrix, translate(0, -handleRotationOffsetY, 0));

    doorGeometry.rightHandle.forEach(item => {
        drawGeometry([{
            geometry: item.geometry,
            transform: mat4()
        }], rightHandleMatrix);
    });

    transparentObjects.push({
        geometry: doorGeometry.rightDoor,
        transform: rightHingeMatrix
    });

    transparentObjects.push({
        geometry: doorGeometry.rightDoorStrips,
        transform: rightHingeMatrix
    });

    // Draw transparent objects last
    transparentObjects.forEach(obj => {
        drawGeometry(obj.geometry, obj.transform);
    });
}