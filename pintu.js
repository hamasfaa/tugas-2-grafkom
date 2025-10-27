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

// Attribute locations
let vPositionLoc;
let vColorLoc;
let vNormalLoc;

// Matrices
let projectionMatrix;
let viewMatrix;

// Animation/Control
let doorAngle = 0;
let doorAngleSlider;
let angleValueSpan;

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
    doorAngleSlider = document.getElementById("doorAngle");
    angleValueSpan = document.getElementById("angleValue");

    gl = canvas.getContext("webgl");
    if (!gl) {
        console.error("WebGL isn't available");
        alert("WebGL isn't available");
        return;
    }

    console.log("WebGL context created successfully");

    // Configure WebGL
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.15, 0.15, 0.15, 1.0); // Dark background like the image
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

    // Set lighting parameters
    gl.uniform3fv(lightPositionLoc, flatten([vec3(5.0, 5.0, 10.0)]));
    gl.uniform3fv(ambientLightLoc, flatten([vec3(0.4, 0.4, 0.4)]));
    gl.uniform3fv(diffuseLightLoc, flatten([vec3(0.6, 0.6, 0.6)]));
    gl.uniform3fv(specularLightLoc, flatten([vec3(0.5, 0.5, 0.5)]));
    gl.uniform1f(shininessLoc, 32.0);

    // Initialize geometry
    initGeometry();

    // Set up projection and view matrices
    projectionMatrix = perspective(45.0, canvas.width / canvas.height, 0.1, 100.0);
    viewMatrix = lookAt(vec3(0, 0, 8), vec3(0, 0, 0), vec3(0, 1, 0));

    // Event listener for the slider
    doorAngleSlider.addEventListener("input", function() {
        doorAngle = parseFloat(doorAngleSlider.value);
        angleValueSpan.textContent = `${doorAngle.toFixed(0)}°`;
        render();
    });

    // Initial render
    render();
};

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
    // Colors matching the image
    const orangeColor = [1.0, 0.45, 0.35, 1.0];      // Coral/orange outer frame
    const darkFrameColor = [0.15, 0.15, 0.15, 1.0]; // Dark inner frame
    const glassColor = [0.45, 0.55, 0.6, 0.85];     // Blue-gray glass
    const handleColor = [0.95, 0.95, 0.95, 1.0];    // White handles
    
    // Dimensions - adjusted for no center divider
    const OUTER_FRAME_THICKNESS = 0.25;
    const INNER_FRAME_THICKNESS = 0.12;
    const FRAME_DEPTH = 0.15;
    const TOTAL_WIDTH = 3.5;
    const TOTAL_HEIGHT = 4.0;
    
    const INNER_WIDTH = TOTAL_WIDTH - (OUTER_FRAME_THICKNESS * 2);
    const INNER_HEIGHT = TOTAL_HEIGHT - (OUTER_FRAME_THICKNESS * 2);
    
    // Each door takes half the inner width (no center divider)
    const DOOR_WIDTH = (INNER_WIDTH - INNER_FRAME_THICKNESS * 2) / 2;
    const DOOR_HEIGHT = INNER_HEIGHT - (INNER_FRAME_THICKNESS * 2);
    const DOOR_THICKNESS = 0.05;
    
    const HANDLE_WIDTH = 0.08;
    const HANDLE_HEIGHT = 0.5;
    const HANDLE_DEPTH = 0.08;
    
    // === OUTER FRAME (Orange) ===
    // Top
    doorGeometry.outerFrame.push({
        geometry: createBox(TOTAL_WIDTH, OUTER_FRAME_THICKNESS, FRAME_DEPTH, orangeColor),
        transform: translate(0, TOTAL_HEIGHT / 2 - OUTER_FRAME_THICKNESS / 2, 0)
    });
    
    // Bottom
    doorGeometry.outerFrame.push({
        geometry: createBox(TOTAL_WIDTH, OUTER_FRAME_THICKNESS, FRAME_DEPTH, orangeColor),
        transform: translate(0, -TOTAL_HEIGHT / 2 + OUTER_FRAME_THICKNESS / 2, 0)
    });
    
    // Left
    doorGeometry.outerFrame.push({
        geometry: createBox(OUTER_FRAME_THICKNESS, TOTAL_HEIGHT, FRAME_DEPTH, orangeColor),
        transform: translate(-TOTAL_WIDTH / 2 + OUTER_FRAME_THICKNESS / 2, 0, 0)
    });
    
    // Right
    doorGeometry.outerFrame.push({
        geometry: createBox(OUTER_FRAME_THICKNESS, TOTAL_HEIGHT, FRAME_DEPTH, orangeColor),
        transform: translate(TOTAL_WIDTH / 2 - OUTER_FRAME_THICKNESS / 2, 0, 0)
    });
    
    // === INNER FRAME (Dark) - NO CENTER DIVIDER ===
    // Top
    doorGeometry.innerFrame.push({
        geometry: createBox(INNER_WIDTH, INNER_FRAME_THICKNESS, FRAME_DEPTH * 0.7, darkFrameColor),
        transform: translate(0, INNER_HEIGHT / 2 - INNER_FRAME_THICKNESS / 2, FRAME_DEPTH * 0.15)
    });
    
    // Bottom
    doorGeometry.innerFrame.push({
        geometry: createBox(INNER_WIDTH, INNER_FRAME_THICKNESS, FRAME_DEPTH * 0.7, darkFrameColor),
        transform: translate(0, -INNER_HEIGHT / 2 + INNER_FRAME_THICKNESS / 2, FRAME_DEPTH * 0.15)
    });
    
    // Left
    doorGeometry.innerFrame.push({
        geometry: createBox(INNER_FRAME_THICKNESS, INNER_HEIGHT, FRAME_DEPTH * 0.7, darkFrameColor),
        transform: translate(-INNER_WIDTH / 2 + INNER_FRAME_THICKNESS / 2, 0, FRAME_DEPTH * 0.15)
    });
    
    // Right
    doorGeometry.innerFrame.push({
        geometry: createBox(INNER_FRAME_THICKNESS, INNER_HEIGHT, FRAME_DEPTH * 0.7, darkFrameColor),
        transform: translate(INNER_WIDTH / 2 - INNER_FRAME_THICKNESS / 2, 0, FRAME_DEPTH * 0.15)
    });
    
    // === NO CENTER DIVIDER - REMOVED ===
    
    // === LEFT DOOR PANEL (relative to hinge) ===
    doorGeometry.leftDoor.push({
        geometry: createBox(DOOR_WIDTH, DOOR_HEIGHT, DOOR_THICKNESS, glassColor),
        transform: translate(DOOR_WIDTH / 2, 0, FRAME_DEPTH * 0.2)
    });
    
    // Left handle (near the center where doors meet)
    doorGeometry.leftHandle.push({
        geometry: createBox(HANDLE_WIDTH, HANDLE_HEIGHT, HANDLE_DEPTH, handleColor),
        transform: translate(DOOR_WIDTH - 0.25, 0, FRAME_DEPTH * 0.25 + DOOR_THICKNESS / 2)
    });
    
    // === RIGHT DOOR PANEL (relative to hinge) ===
    doorGeometry.rightDoor.push({
        geometry: createBox(DOOR_WIDTH, DOOR_HEIGHT, DOOR_THICKNESS, glassColor),
        transform: translate(-DOOR_WIDTH / 2, 0, FRAME_DEPTH * 0.2)
    });
    
    // Right handle (near the center where doors meet)
    doorGeometry.rightHandle.push({
        geometry: createBox(HANDLE_WIDTH, HANDLE_HEIGHT, HANDLE_DEPTH, handleColor),
        transform: translate(-DOOR_WIDTH + 0.25, 0, FRAME_DEPTH * 0.25 + DOOR_THICKNESS / 2)
    });
}

function drawGeometry(geometryList, parentTransform) {
    geometryList.forEach(item => {
        const { geometry, transform } = item;
        
        // Combine transformations
        let modelMatrix = mult(parentTransform, transform);
        
        // Create buffers for this geometry
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
        
        // Set uniforms
        let mvMatrix = mult(viewMatrix, modelMatrix);
        let mvpMatrix = mult(projectionMatrix, mvMatrix);
        
        gl.uniformMatrix4fv(mvpMatrixLoc, false, flatten(mvpMatrix));
        gl.uniformMatrix4fv(normalMatrixLoc, false, flatten(mvMatrix));
        
        // Draw
        gl.drawElements(gl.TRIANGLES, geometry.indices.length, gl.UNSIGNED_SHORT, 0);
    });
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    const OUTER_FRAME_THICKNESS = 0.25;
    const INNER_FRAME_THICKNESS = 0.12;
    const TOTAL_WIDTH = 3.5;
    const INNER_WIDTH = TOTAL_WIDTH - (OUTER_FRAME_THICKNESS * 2);
    
    // Store transparent objects
    let transparentObjects = [];
    
    // 1. Draw static frames (opaque)
    drawGeometry(doorGeometry.outerFrame, mat4());
    drawGeometry(doorGeometry.innerFrame, mat4());
    
    // 2. Left door hierarchy - hinge on the left side
    const leftHingeX = -INNER_WIDTH / 2 + INNER_FRAME_THICKNESS;
    let leftHingeMatrix = translate(leftHingeX, 0, 0);
    leftHingeMatrix = mult(leftHingeMatrix, rotate(doorAngle, vec3(0, 1, 0)));
    
    // Draw left handle (opaque)
    drawGeometry(doorGeometry.leftHandle, leftHingeMatrix);
    
    // Store left door panel (transparent)
    transparentObjects.push({ 
        geometry: doorGeometry.leftDoor, 
        transform: leftHingeMatrix 
    });
    
    // 3. Right door hierarchy - hinge on the right side
    const rightHingeX = INNER_WIDTH / 2 - INNER_FRAME_THICKNESS;
    let rightHingeMatrix = translate(rightHingeX, 0, 0);
    rightHingeMatrix = mult(rightHingeMatrix, rotate(-doorAngle, vec3(0, 1, 0)));
    
    // Draw right handle (opaque)
    drawGeometry(doorGeometry.rightHandle, rightHingeMatrix);
    
    // Store right door panel (transparent)
    transparentObjects.push({ 
        geometry: doorGeometry.rightDoor, 
        transform: rightHingeMatrix 
    });
    
    // 4. Draw transparent objects last
    transparentObjects.forEach(obj => {
        drawGeometry(obj.geometry, obj.transform);
    });
}