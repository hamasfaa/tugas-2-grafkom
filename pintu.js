"use strict";

let gl;
let canvas;
let program;

// Uniform location
let mvpMatrixLoc;

// Attribute locations
let vPositionLoc;
let vColorLoc;

// Matrices
let projectionMatrix;
let viewMatrix;

// VBOs and IBO
let cubePositionVBO;
let cubeIndexIBO;

// Color VBOs for different parts
let frameColorVBO;
let doorColorVBO;
let handleColorVBO;

// Number of indices for the cube
const CUBE_INDICES_COUNT = 36;

// Animation/Control
let doorAngle = 0;
let doorAngleSlider;
let angleValueSpan;

window.onload = function init() {
    canvas = document.getElementById("gl-canvas");
    doorAngleSlider = document.getElementById("doorAngle");
    angleValueSpan = document.getElementById("angleValue");

    gl = canvas.getContext("webgl");
    if (!gl) {
        console.error("WebGL isn't available");
        return;
    }

    // Configure WebGL
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.9, 0.9, 0.9, 1.0); // Light grey background
    gl.enable(gl.DEPTH_TEST);
    // Enable blending for glass transparency
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Load shaders and initialize attribute buffers
    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    // Get uniform location
    mvpMatrixLoc = gl.getUniformLocation(program, "modelViewProjectionMatrix");

    // Get Attribute locations
    vPositionLoc = gl.getAttribLocation(program, "vPosition");
    vColorLoc = gl.getAttribLocation(program, "vColor");

    if (vPositionLoc < 0 || vColorLoc < 0) {
        console.error("Failed to get attribute locations. Check shader attribute names (vPosition, vColor).");
        return;
    }

    // Initialize buffers (VBOs and IBO)
    initBuffers();

    // Set up projection and view matrices
    projectionMatrix = perspective(45.0, canvas.width / canvas.height, 0.1, 100.0);
    // Camera positioned to see the door from front-right angle
    viewMatrix = lookAt(vec3(3, 3, 12), vec3(0, 0, 0), vec3(0, 1, 0));

    // Event listener for the slider
    doorAngleSlider.addEventListener("input", function() {
        doorAngle = parseFloat(doorAngleSlider.value);
        angleValueSpan.textContent = `${doorAngle.toFixed(0)}°`;
        render();
    });

    // Initial render
    render();
};

function initBuffers() {
    // A standard unit cube (1x1x1 centered at origin)
    const cubeVertices = new Float32Array([
        // Front face
        -0.5, -0.5,  0.5,
         0.5, -0.5,  0.5,
         0.5,  0.5,  0.5,
        -0.5,  0.5,  0.5,
        // Back face
        -0.5, -0.5, -0.5,
        -0.5,  0.5, -0.5,
         0.5,  0.5, -0.5,
         0.5, -0.5, -0.5,
        // Top face
        -0.5,  0.5, -0.5,
        -0.5,  0.5,  0.5,
         0.5,  0.5,  0.5,
         0.5,  0.5, -0.5,
        // Bottom face
        -0.5, -0.5, -0.5,
         0.5, -0.5, -0.5,
         0.5, -0.5,  0.5,
        -0.5, -0.5,  0.5,
        // Right face
         0.5, -0.5, -0.5,
         0.5,  0.5, -0.5,
         0.5,  0.5,  0.5,
         0.5, -0.5,  0.5,
        // Left face
        -0.5, -0.5, -0.5,
        -0.5, -0.5,  0.5,
        -0.5,  0.5,  0.5,
        -0.5,  0.5, -0.5,
    ]);

    // IBO data: 12 triangles (2 per face)
    const cubeIndices = new Uint16Array([
        0, 1, 2,      0, 2, 3,    // Front
        4, 5, 6,      4, 6, 7,    // Back
        8, 9, 10,     8, 10, 11,   // Top
        12, 13, 14,   12, 14, 15,  // Bottom
        16, 17, 18,   16, 18, 19,  // Right
        20, 21, 22,   20, 22, 23   // Left
    ]);

    // --- Create VBOs and IBO ---

    // Position VBO (common for all cubes)
    cubePositionVBO = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cubePositionVBO);
    gl.bufferData(gl.ARRAY_BUFFER, cubeVertices, gl.STATIC_DRAW);

    // Index IBO (common for all cubes)
    cubeIndexIBO = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeIndexIBO);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, cubeIndices, gl.STATIC_DRAW);

    // --- Color VBOs (one for each part) ---
    // Helper function to create a solid color array
    const createSolidColorArray = (color) => {
        let colors = [];
        for (let i = 0; i < 24; i++) { // 24 vertices
            colors.push(color[0], color[1], color[2], color[3]);
        }
        return new Float32Array(colors);
    };

    // Frame color (Reddish-Orange, Opaque) - matching your image
    const frameColor = createSolidColorArray([1.0, 0.42, 0.29, 1.0]);
    frameColorVBO = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, frameColorVBO);
    gl.bufferData(gl.ARRAY_BUFFER, frameColor, gl.STATIC_DRAW);
    
    // Door color (Glass-Blue, Translucent)
    const doorColor = createSolidColorArray([0.6, 0.8, 0.9, 0.4]);
    doorColorVBO = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, doorColorVBO);
    gl.bufferData(gl.ARRAY_BUFFER, doorColor, gl.STATIC_DRAW);

    // Handle color (Silver, Opaque)
    const handleColor = createSolidColorArray([0.8, 0.8, 0.85, 1.0]);
    handleColorVBO = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, handleColorVBO);
    gl.bufferData(gl.ARRAY_BUFFER, handleColor, gl.STATIC_DRAW);
    
    // Unbind buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
}

/**
 * Helper function to draw a cube with a given transformation matrix and color buffer
 * @param {mat4} modelMatrix - The model transformation matrix.
 * @param {WebGLBuffer} colorBuffer - The VBO containing the color data.
 */
function drawCube(modelMatrix, colorBuffer) {
    // --- Setup Attributes ---

    // 1. Set Position Attribute
    gl.bindBuffer(gl.ARRAY_BUFFER, cubePositionVBO);
    gl.vertexAttribPointer(vPositionLoc, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPositionLoc);

    // 2. Set Color Attribute
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.vertexAttribPointer(vColorLoc, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColorLoc);

    // 3. Bind Index Buffer
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeIndexIBO);

    // --- Set Uniform ---
    // Combine with view and projection matrices
    let mvMatrix = mult(viewMatrix, modelMatrix);
    let mvpMatrix = mult(projectionMatrix, mvMatrix);
    
    gl.uniformMatrix4fv(mvpMatrixLoc, false, flatten(mvpMatrix));

    // --- Draw ---
    gl.drawElements(gl.TRIANGLES, CUBE_INDICES_COUNT, gl.UNSIGNED_SHORT, 0);
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // --- Constants for door geometry ---
    const FRAME_THICKNESS = 0.4;
    const FRAME_WIDTH = 4.0;
    const FRAME_HEIGHT = 4.0;

    const DOOR_WIDTH = (FRAME_WIDTH - FRAME_THICKNESS) / 2;
    const DOOR_HEIGHT = FRAME_HEIGHT - FRAME_THICKNESS;
    const DOOR_THICKNESS = 0.1;

    const HANDLE_WIDTH = 0.1;
    const HANDLE_HEIGHT = 1.0;
    const HANDLE_THICKNESS = 0.1;
    const HANDLE_OFFSET_X = 0.6; // From center of door
    const HANDLE_OFFSET_Z = 0.15; // From surface of door

    // Store transparent objects to draw last
    let transparentObjects = [];

    // --- 1. Draw Static Frame (OPAQUE - Draw First) ---
    
    // Top beam
    let modelMatrix = translate(0, FRAME_HEIGHT / 2, 0);
    modelMatrix = mult(modelMatrix, scale(FRAME_WIDTH, FRAME_THICKNESS, FRAME_THICKNESS));
    drawCube(modelMatrix, frameColorVBO);

    // Bottom beam
    modelMatrix = translate(0, -FRAME_HEIGHT / 2, 0);
    modelMatrix = mult(modelMatrix, scale(FRAME_WIDTH, FRAME_THICKNESS, FRAME_THICKNESS));
    drawCube(modelMatrix, frameColorVBO);

    // Left beam
    modelMatrix = translate(-FRAME_WIDTH / 2 + FRAME_THICKNESS / 2, 0, 0);
    modelMatrix = mult(modelMatrix, scale(FRAME_THICKNESS, FRAME_HEIGHT, FRAME_THICKNESS));
    drawCube(modelMatrix, frameColorVBO);
    
    // Right beam
    modelMatrix = translate(FRAME_WIDTH / 2 - FRAME_THICKNESS / 2, 0, 0);
    modelMatrix = mult(modelMatrix, scale(FRAME_THICKNESS, FRAME_HEIGHT, FRAME_THICKNESS));
    drawCube(modelMatrix, frameColorVBO);

    // Center divider
    modelMatrix = translate(0, 0, 0);
    modelMatrix = mult(modelMatrix, scale(FRAME_THICKNESS * 0.3, FRAME_HEIGHT, FRAME_THICKNESS));
    drawCube(modelMatrix, frameColorVBO);

    // --- 2. LEFT Door Hierarchy ---
    // Hinge is at the CENTER-LEFT (where center divider meets left door space)
    const leftHingeX = -FRAME_THICKNESS * 0.15;
    
    // Base transformation for the left door's hinge
    let leftHingeMatrix = translate(leftHingeX, 0, 0);
    leftHingeMatrix = mult(leftHingeMatrix, rotateY(doorAngle)); // Opens inward (positive angle)

    // A. Draw Left Handle (OPAQUE - Draw Now)
    // Position handle relative to door center
    let leftHandleMatrix = translate(-DOOR_WIDTH * 0.7, 0, DOOR_THICKNESS / 2 + HANDLE_OFFSET_Z);
    leftHandleMatrix = mult(leftHandleMatrix, scale(HANDLE_WIDTH, HANDLE_HEIGHT, HANDLE_THICKNESS));
    // Apply hinge transformation
    leftHandleMatrix = mult(leftHingeMatrix, leftHandleMatrix);
    drawCube(leftHandleMatrix, handleColorVBO);

    // B. Store Left Door Panel (TRANSPARENT - Draw Later)
    // Position door relative to hinge (door extends to the LEFT of hinge)
    let leftDoorMatrix = translate(-DOOR_WIDTH / 2, 0, 0);
    leftDoorMatrix = mult(leftDoorMatrix, scale(DOOR_WIDTH, DOOR_HEIGHT, DOOR_THICKNESS));
    // Apply hinge transformation
    leftDoorMatrix = mult(leftHingeMatrix, leftDoorMatrix);
    transparentObjects.push({ matrix: leftDoorMatrix, colorVBO: doorColorVBO });

    // --- 3. RIGHT Door Hierarchy ---
    // Hinge is at the CENTER-RIGHT (where center divider meets right door space)
    const rightHingeX = FRAME_THICKNESS * 0.15;

    // Base transformation for the right door's hinge
    let rightHingeMatrix = translate(rightHingeX, 0, 0);
    rightHingeMatrix = mult(rightHingeMatrix, rotateY(-doorAngle)); // Opens inward (negative for symmetry)

    // A. Draw Right Handle (OPAQUE - Draw Now)
    // Position handle relative to door center
    let rightHandleMatrix = translate(DOOR_WIDTH * 0.7, 0, DOOR_THICKNESS / 2 + HANDLE_OFFSET_Z);
    rightHandleMatrix = mult(rightHandleMatrix, scale(HANDLE_WIDTH, HANDLE_HEIGHT, HANDLE_THICKNESS));
    // Apply hinge transformation
    rightHandleMatrix = mult(rightHingeMatrix, rightHandleMatrix);
    drawCube(rightHandleMatrix, handleColorVBO);

    // B. Store Right Door Panel (TRANSPARENT - Draw Later)
    // Position door relative to hinge (door extends to the RIGHT of hinge)
    let rightDoorMatrix = translate(DOOR_WIDTH / 2, 0, 0);
    rightDoorMatrix = mult(rightDoorMatrix, scale(DOOR_WIDTH, DOOR_HEIGHT, DOOR_THICKNESS));
    // Apply hinge transformation
    rightDoorMatrix = mult(rightHingeMatrix, rightDoorMatrix);
    transparentObjects.push({ matrix: rightDoorMatrix, colorVBO: doorColorVBO });

    // --- 4. Draw all transparent objects LAST ---
    transparentObjects.forEach(obj => {
        drawCube(obj.matrix, obj.colorVBO);
    });
}