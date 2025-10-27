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
let doorAngle = 0;
let rotationX = 0;
let rotationY = 0;
let rotationZ = 0;
let zoomDistance = 8;
let autoRotateEnabled = false;
// ✅ NEW: handle rotation
let handleAngle = 0;

// Lighting parameters
let lightPosition = vec3(5.0, 5.0, 10.0);
let ambientLight = vec3(0.4, 0.4, 0.4);
let diffuseLight = vec3(0.6, 0.6, 0.6);
let specularLight = vec3(0.5, 0.5, 0.5);
let shininess = 32.0;
let lightingEnabled = true;

// Geometry data storage
let doorGeometry = {
    outerFrame: [],
    innerFrame: [],
    leftDoor: [],
    rightDoor: [],
    leftHandle: [],
    rightHandle: []
};

window.onload = function init() {
    canvas = document.getElementById("gl-canvas");

    gl = canvas.getContext("webgl");
    if (!gl) {
        console.error("WebGL isn't available");
        alert("WebGL isn't available");
        return;
    }

    // Configure WebGL
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.15, 0.15, 0.15, 1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Load shaders
    program = initShaders(gl, "vertex-shader", "fragment-shader");
    if (!program) {
        console.error("Failed to initialize shaders");
        return;
    }
    gl.useProgram(program);

    // Get attribute locations
    vPositionLoc = gl.getAttribLocation(program, "vPosition");
    vColorLoc = gl.getAttribLocation(program, "vColor");
    vNormalLoc = gl.getAttribLocation(program, "vNormal");

    // Get uniform locations
    mvpMatrixLoc = gl.getUniformLocation(program, "modelViewProjectionMatrix");
    normalMatrixLoc = gl.getUniformLocation(program, "normalMatrix");
    lightPositionLoc = gl.getUniformLocation(program, "lightPosition");
    ambientLightLoc = gl.getUniformLocation(program, "ambientLight");
    diffuseLightLoc = gl.getUniformLocation(program, "diffuseLight");
    specularLightLoc = gl.getUniformLocation(program, "specularLight");
    shininessLoc = gl.getUniformLocation(program, "shininess");
    enableLightingLoc = gl.getUniformLocation(program, "enableLighting");

    // Initialize geometry
    initGeometry();

    // Set up projection matrix
    projectionMatrix = perspective(45.0, canvas.width / canvas.height, 0.1, 100.0);

    // Setup all event listeners
    setupEventListeners();

    // Start animation loop
    animate();
};

function setupEventListeners() {
    // Door angle
    const doorAngleSlider = document.getElementById("doorAngle");
    const angleValueSpan = document.getElementById("angleValue");
    doorAngleSlider.addEventListener("input", function() {
        doorAngle = parseFloat(this.value);
        angleValueSpan.textContent = `${doorAngle.toFixed(0)}°`;
    });

    // ✅ NEW: Handle rotation slider
    const handleAngleSlider = document.getElementById("handleAngle");
    const handleAngleValue = document.getElementById("handleAngleValue");
    handleAngleSlider.addEventListener("input", function () {
        handleAngle = parseFloat(this.value);
        handleAngleValue.textContent = `${handleAngle.toFixed(0)}°`;
    });

    // Rotation controls
    setupSlider("rotateX", "rotateXValue", (val) => { rotationX = val; }, "°");
    setupSlider("rotateY", "rotateYValue", (val) => { rotationY = val; }, "°");
    setupSlider("rotateZ", "rotateZValue", (val) => { rotationZ = val; }, "°");
    setupSlider("zoom", "zoomValue", (val) => { zoomDistance = val; }, "");

    // Lighting controls
    document.getElementById("enableLighting").addEventListener("change", function() {
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
    slider.addEventListener("input", function() {
        const val = parseFloat(this.value);
        callback(val);
        valueSpan.textContent = val.toFixed(1) + suffix;
    });
}

// View preset functions
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
        vec3(-w, -h,  d), vec3( w, -h,  d), vec3( w,  h,  d), vec3(-w,  h,  d),
        // Back face
        vec3(-w, -h, -d), vec3(-w,  h, -d), vec3( w,  h, -d), vec3( w, -h, -d),
        // Top face
        vec3(-w,  h, -d), vec3(-w,  h,  d), vec3( w,  h,  d), vec3( w,  h, -d),
        // Bottom face
        vec3(-w, -h, -d), vec3( w, -h, -d), vec3( w, -h,  d), vec3(-w, -h,  d),
        // Right face
        vec3( w, -h, -d), vec3( w,  h, -d), vec3( w,  h,  d), vec3( w, -h,  d),
        // Left face
        vec3(-w, -h, -d), vec3(-w, -h,  d), vec3(-w,  h,  d), vec3(-w,  h, -d)
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
    
    const colors = [];
    for (let i = 0; i < 24; i++) {
        colors.push(vec4(color[0], color[1], color[2], color[3]));
    }
    
    const indices = [
        0, 1, 2,    0, 2, 3,    // Front
        4, 5, 6,    4, 6, 7,    // Back
        8, 9, 10,   8, 10, 11,  // Top
        12, 13, 14, 12, 14, 15, // Bottom
        16, 17, 18, 16, 18, 19, // Right
        20, 21, 22, 20, 22, 23  // Left
    ];
    
    return { positions, normals, colors, indices };
}

function initGeometry() {
    // Colors
    const orangeColor = [1.0, 0.45, 0.35, 1.0];
    const darkFrameColor = [0.15, 0.15, 0.15, 1.0];
    const glassColor = [0.45, 0.55, 0.6, 0.85];
    const handleColor = [0.95, 0.95, 0.95, 1.0];
    
    // Dimensions
    const OUTER_FRAME_THICKNESS = 0.25;
    const INNER_FRAME_THICKNESS = 0.12;
    const FRAME_DEPTH = 0.15;
    const TOTAL_WIDTH = 3.5;
    const TOTAL_HEIGHT = 4.0;
    
    const INNER_WIDTH = TOTAL_WIDTH - (OUTER_FRAME_THICKNESS * 2);
    const INNER_HEIGHT = TOTAL_HEIGHT - (OUTER_FRAME_THICKNESS * 2);
    
    const DOOR_WIDTH = (INNER_WIDTH - INNER_FRAME_THICKNESS * 2) / 2;
    const DOOR_HEIGHT = INNER_HEIGHT - (INNER_FRAME_THICKNESS * 2);
    const DOOR_THICKNESS = 0.05;
    
    const HANDLE_WIDTH = 0.08;
    const HANDLE_HEIGHT = 0.5;
    const HANDLE_DEPTH = 0.08;
    
    // === OUTER FRAME (Orange) ===
    doorGeometry.outerFrame.push({
        geometry: createBox(TOTAL_WIDTH, OUTER_FRAME_THICKNESS, FRAME_DEPTH, orangeColor),
        transform: translate(0, TOTAL_HEIGHT / 2 - OUTER_FRAME_THICKNESS / 2, 0)
    });
    doorGeometry.outerFrame.push({
        geometry: createBox(TOTAL_WIDTH, OUTER_FRAME_THICKNESS, FRAME_DEPTH, orangeColor),
        transform: translate(0, -TOTAL_HEIGHT / 2 + OUTER_FRAME_THICKNESS / 2, 0)
    });
    doorGeometry.outerFrame.push({
        geometry: createBox(OUTER_FRAME_THICKNESS, TOTAL_HEIGHT, FRAME_DEPTH, orangeColor),
        transform: translate(-TOTAL_WIDTH / 2 + OUTER_FRAME_THICKNESS / 2, 0, 0)
    });
    doorGeometry.outerFrame.push({
        geometry: createBox(OUTER_FRAME_THICKNESS, TOTAL_HEIGHT, FRAME_DEPTH, orangeColor),
        transform: translate(TOTAL_WIDTH / 2 - OUTER_FRAME_THICKNESS / 2, 0, 0)
    });
    
    // === INNER FRAME (Dark) ===
    doorGeometry.innerFrame.push({
        geometry: createBox(INNER_WIDTH, INNER_FRAME_THICKNESS, FRAME_DEPTH * 0.7, darkFrameColor),
        transform: translate(0, INNER_HEIGHT / 2 - INNER_FRAME_THICKNESS / 2, FRAME_DEPTH * 0.15)
    });
    doorGeometry.innerFrame.push({
        geometry: createBox(INNER_WIDTH, INNER_FRAME_THICKNESS, FRAME_DEPTH * 0.7, darkFrameColor),
        transform: translate(0, -INNER_HEIGHT / 2 + INNER_FRAME_THICKNESS / 2, FRAME_DEPTH * 0.15)
    });
    doorGeometry.innerFrame.push({
        geometry: createBox(INNER_FRAME_THICKNESS, INNER_HEIGHT, FRAME_DEPTH * 0.7, darkFrameColor),
        transform: translate(-INNER_WIDTH / 2 + INNER_FRAME_THICKNESS / 2, 0, FRAME_DEPTH * 0.15)
    });
    doorGeometry.innerFrame.push({
        geometry: createBox(INNER_FRAME_THICKNESS, INNER_HEIGHT, FRAME_DEPTH * 0.7, darkFrameColor),
        transform: translate(INNER_WIDTH / 2 - INNER_FRAME_THICKNESS / 2, 0, FRAME_DEPTH * 0.15)
    });
    
    // === LEFT DOOR ===
    doorGeometry.leftDoor.push({
        geometry: createBox(DOOR_WIDTH, DOOR_HEIGHT, DOOR_THICKNESS, glassColor),
        transform: translate(DOOR_WIDTH / 2, 0, FRAME_DEPTH * 0.2)
    });
    // ✅ tambahkan pivotY (sekrup atas) untuk gagang kiri
    doorGeometry.leftHandle.push({
        geometry: createBox(HANDLE_WIDTH, HANDLE_HEIGHT, HANDLE_DEPTH, handleColor),
        transform: translate(DOOR_WIDTH - 0.25, 0, FRAME_DEPTH * 0.25 + DOOR_THICKNESS / 2),
        pivotY: HANDLE_HEIGHT / 2 - 0.05 // pivot dekat kepala atas gagang
    });
    
    // === RIGHT DOOR ===
    doorGeometry.rightDoor.push({
        geometry: createBox(DOOR_WIDTH, DOOR_HEIGHT, DOOR_THICKNESS, glassColor),
        transform: translate(-DOOR_WIDTH / 2, 0, FRAME_DEPTH * 0.2)
    });
    // ✅ tambahkan pivotY (sekrup atas) untuk gagang kanan
    doorGeometry.rightHandle.push({
        geometry: createBox(HANDLE_WIDTH, HANDLE_HEIGHT, HANDLE_DEPTH, handleColor),
        transform: translate(-DOOR_WIDTH + 0.25, 0, FRAME_DEPTH * 0.25 + DOOR_THICKNESS / 2),
        pivotY: HANDLE_HEIGHT / 2 - 0.05
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
        
        let mvMatrix = mult(viewMatrix, modelMatrix);
        let mvpMatrix = mult(projectionMatrix, mvMatrix);
        
        gl.uniformMatrix4fv(mvpMatrixLoc, false, flatten(mvpMatrix));
        gl.uniformMatrix4fv(normalMatrixLoc, false, flatten(mvMatrix));
        
        gl.drawElements(gl.TRIANGLES, geometry.indices.length, gl.UNSIGNED_SHORT, 0);
    });
}

// ✅ NEW: helper untuk memutar gagang pada pivot lokalnya (efek baut atas lepas)
function drawHandleWithPivot(handleItem, parentTransform, angleDeg) {
    const base = handleItem.transform;
    const pivotY = handleItem.pivotY || 0.0;
    // Transform lokal: T(base) · T(0,pivotY,0) · Rz(angle) · T(0,-pivotY,0)
    const local = mult(
        mult(base, translate(0, pivotY, 0)),
        mult(rotate(angleDeg, vec3(0, 0, 1)), translate(0, -pivotY, 0))
    );
    drawGeometry([{ geometry: handleItem.geometry, transform: local }], parentTransform);
}

function animate() {
    // Auto-rotate if enabled
    if (autoRotateEnabled) {
        rotationY = (rotationY + 0.5) % 360;
        document.getElementById("rotateY").value = rotationY;
        document.getElementById("rotateYValue").textContent = rotationY.toFixed(1) + "°";
    }
    
    render();
    requestAnimationFrame(animate);
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
    const INNER_FRAME_THICKNESS = 0.12;
    const TOTAL_WIDTH = 3.5;
    const INNER_WIDTH = TOTAL_WIDTH - (OUTER_FRAME_THICKNESS * 2);
    
    let transparentObjects = [];
    
    // Draw opaque objects
    drawGeometry(doorGeometry.outerFrame, mat4());
    drawGeometry(doorGeometry.innerFrame, mat4());
    
    // Left door hierarchy
    const leftHingeX = -INNER_WIDTH / 2 + INNER_FRAME_THICKNESS;
    let leftHingeMatrix = translate(leftHingeX, 0, 0);
    leftHingeMatrix = mult(leftHingeMatrix, rotate(doorAngle, vec3(0, 1, 0)));
    
    // ✅ Gagang kiri diputar di pivot (efek baut atas lepas)
    if (doorGeometry.leftHandle.length > 0) {
        drawHandleWithPivot(doorGeometry.leftHandle[0], leftHingeMatrix, handleAngle);
    }
    // Panel kiri (kaca) transparan — render belakangan
    transparentObjects.push({ 
        geometry: doorGeometry.leftDoor, 
        transform: leftHingeMatrix 
    });
    
    // Right door hierarchy
    const rightHingeX = INNER_WIDTH / 2 - INNER_FRAME_THICKNESS;
    let rightHingeMatrix = translate(rightHingeX, 0, 0);
    rightHingeMatrix = mult(rightHingeMatrix, rotate(-doorAngle, vec3(0, 1, 0)));
    
    // ✅ Gagang kanan juga diputar (arah sama; jika mau dibalik, ganti ke -handleAngle)
    if (doorGeometry.rightHandle.length > 0) {
        drawHandleWithPivot(doorGeometry.rightHandle[0], rightHingeMatrix, handleAngle);
    }
    // Panel kanan (kaca) transparan — render belakangan
    transparentObjects.push({ 
        geometry: doorGeometry.rightDoor, 
        transform: rightHingeMatrix 
    });
    
    // Draw transparent objects last
    transparentObjects.forEach(obj => {
        drawGeometry(obj.geometry, obj.transform);
    });
}
