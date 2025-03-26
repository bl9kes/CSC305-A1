var canvas;
var gl;

var program;

var near = 1;
var far = 100;

var left = -6.0;
var right = 6.0;
var ytop = 6.0;
var bottom = -6.0;

var lightPosition2 = vec4(100.0, 100.0, 100.0, 1.0);
var lightPosition = vec4(0.0, 0.0, 100.0, 1.0);

var lightAmbient = vec4(0.2, 0.2, 0.2, 1.0);
var lightDiffuse = vec4(1.0, 1.0, 1.0, 1.0);
var lightSpecular = vec4(1.0, 1.0, 1.0, 1.0);

var materialAmbient = vec4(1.0, 0.0, 1.0, 1.0);
var materialDiffuse = vec4(1.0, 0.8, 0.0, 1.0);
var materialSpecular = vec4(0.4, 0.4, 0.4, 1.0);
var materialShininess = 30.0;

var ambientColor, diffuseColor, specularColor;

var modelMatrix, viewMatrix, modelViewMatrix, projectionMatrix, normalMatrix;
var modelViewMatrixLoc, projectionMatrixLoc, normalMatrixLoc;
var eye;
var at = vec3(0.0, 0.0, 0.0);
var up = vec3(0.0, 1.0, 0.0);

var RX = 0;
var RY = 0;
var RZ = 0;

var MS = []; // The modeling matrix stack
var TIME = 0.0; // Realtime
var dt = 0.0;
var prevTime = 0.0;
var resetTimerFlag = true;
var animFlag = false;
var controller;

// These are used to store the current state of objects.
// In animation it is often useful to think of an object as having some DOF
// Then the animation is simply evolving those DOF over time. You could very easily make a higher level object that stores these as Position, Rotation (and also Scale!)
var sphereRotation = [0, 0, 0];
var spherePosition = [-4, 0, 0];

var cubeRotation = [0, 0, 0];
var cubePosition = [-1, 0, 0];

var cylinderRotation = [0, 0, 0];
var cylinderPosition = [1.1, 0, 0];

var coneRotation = [0, 0, 0];
var conePosition = [3, 0, 0];

// My Code
var astronautRotation = [-30, 0, 0];
var astronautPosition = [0, -1, 0]; // Base position for the astronaut

// Colours
var bodyColour = vec4(1.0, 1.0, 1.0, 1.0); // White colour
var blue = vec4(0.0, 0.1, 0.9, 1.0);
var lavender = vec4(0.5, 0.5, 1.0, 1.0);
var orange = vec4(1.0, 0.4, 0.0, 1.0);
var nasaColour = vec4(0.0, 0.2, 1.0, 1.0); //

var jellyColour = vec4(0.9, 0.1, 0.5, 1.0); // Hot pink colour

// Sizes
var legHeight = 0.55;
var legWidth = 0.165;
var legDepth = 0.165;

var armWidth = 0.15;
var armHeight = 0.55;
var armDepth = 0.15;

// Setting the colour which is needed during illumination of a surface
function setColor(c) {
  ambientProduct = mult(lightAmbient, c);
  diffuseProduct = mult(lightDiffuse, c);
  specularProduct = mult(lightSpecular, materialSpecular);

  gl.uniform4fv(
    gl.getUniformLocation(program, "ambientProduct"),
    flatten(ambientProduct)
  );
  gl.uniform4fv(
    gl.getUniformLocation(program, "diffuseProduct"),
    flatten(diffuseProduct)
  );
  gl.uniform4fv(
    gl.getUniformLocation(program, "specularProduct"),
    flatten(specularProduct)
  );
  gl.uniform4fv(
    gl.getUniformLocation(program, "lightPosition"),
    flatten(lightPosition)
  );
  gl.uniform1f(gl.getUniformLocation(program, "shininess"), materialShininess);
}

// Stars array
var stars = [];
for (var i = 0; i < 60; i++) {
  stars.push([Math.random() * 12 - 6, Math.random() * 12 - 6, -5]);
}

window.onload = function init() {
  canvas = document.getElementById("gl-canvas");

  gl = WebGLUtils.setupWebGL(canvas);
  if (!gl) {
    alert("WebGL isn't available");
  }

  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  gl.enable(gl.DEPTH_TEST);

  //
  //  Load shaders and initialize attribute buffers
  //
  program = initShaders(gl, "vertex-shader", "fragment-shader");
  gl.useProgram(program);

  setColor(materialDiffuse);

  // Initialize some shapes, note that the curved ones are procedural which allows you to parameterize how nice they look
  // Those number will correspond to how many sides are used to "estimate" a curved surface. More = smoother
  Cube.init(program);
  Cylinder.init(20, program);
  Cone.init(20, program);
  Sphere.init(36, program);

  // Matrix uniforms
  modelViewMatrixLoc = gl.getUniformLocation(program, "modelViewMatrix");
  normalMatrixLoc = gl.getUniformLocation(program, "normalMatrix");
  projectionMatrixLoc = gl.getUniformLocation(program, "projectionMatrix");

  // Lighting Uniforms
  gl.uniform4fv(
    gl.getUniformLocation(program, "ambientProduct"),
    flatten(ambientProduct)
  );
  gl.uniform4fv(
    gl.getUniformLocation(program, "diffuseProduct"),
    flatten(diffuseProduct)
  );
  gl.uniform4fv(
    gl.getUniformLocation(program, "specularProduct"),
    flatten(specularProduct)
  );
  gl.uniform4fv(
    gl.getUniformLocation(program, "lightPosition"),
    flatten(lightPosition)
  );
  gl.uniform1f(gl.getUniformLocation(program, "shininess"), materialShininess);

  document.getElementById("animToggleButton").onclick = function () {
    if (animFlag) {
      animFlag = false;
    } else {
      animFlag = true;
      resetTimerFlag = true;
      window.requestAnimFrame(render);
    }
    //console.log(animFlag);
  };

  render(0);
};

// Sets the modelview and normal matrix in the shaders
function setMV() {
  modelViewMatrix = mult(viewMatrix, modelMatrix);
  gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
  normalMatrix = inverseTranspose(modelViewMatrix);
  gl.uniformMatrix4fv(normalMatrixLoc, false, flatten(normalMatrix));
}

// Sets the projection, modelview and normal matrix in the shaders
function setAllMatrices() {
  gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));
  setMV();
}

// Draws a 2x2x2 cube center at the origin
// Sets the modelview matrix and the normal matrix of the global program
// Sets the attributes and calls draw arrays
function drawCube() {
  setMV();
  Cube.draw();
}

// Draws a sphere centered at the origin of radius 1.0.
// Sets the modelview matrix and the normal matrix of the global program
// Sets the attributes and calls draw arrays
function drawSphere() {
  setMV();
  Sphere.draw();
}

// Draws a cylinder along z of height 1 centered at the origin
// and radius 0.5.
// Sets the modelview matrix and the normal matrix of the global program
// Sets the attributes and calls draw arrays
function drawCylinder() {
  setMV();
  Cylinder.draw();
}

// Draws a cone along z of height 1 centered at the origin
// and base radius 1.0.
// Sets the modelview matrix and the normal matrix of the global program
// Sets the attributes and calls draw arrays
function drawCone() {
  setMV();
  Cone.draw();
}

// Post multiples the modelview matrix with a translation matrix
// and replaces the modeling matrix with the result, x, y, and z are the translation amounts for each axis
function gTranslate(x, y, z) {
  modelMatrix = mult(modelMatrix, translate([x, y, z]));
}

// Post multiples the modelview matrix with a rotation matrix
// and replaces the modeling matrix with the result, theta is the rotation amount, x, y, z are the components of an axis vector (angle, axis rotations!)
function gRotate(theta, x, y, z) {
  modelMatrix = mult(modelMatrix, rotate(theta, [x, y, z]));
}

// Post multiples the modelview matrix with a scaling matrix
// and replaces the modeling matrix with the result, x, y, and z are the scale amounts for each axis
function gScale(sx, sy, sz) {
  modelMatrix = mult(modelMatrix, scale(sx, sy, sz));
}

// Pops MS and stores the result as the current modelMatrix
function gPop() {
  modelMatrix = MS.pop();
}

// pushes the current modelViewMatrix in the stack MS
function gPush() {
  MS.push(modelMatrix);
}

// My Code
function drawStars() {
  for (var i = 0; i < stars.length; i++) {
    gPush();
    gTranslate(stars[i][0], stars[i][1], stars[i][2]);
    gScale(0.05, 0.05, 0.05);
    setColor(vec4(1, 1, 1, 1));
    drawSphere();
    gPop();

    // Move stars downward and reset if offscreen
    stars[i][1] += 0.02; // Move upward
    stars[i][0] += 0.01; // Move rightward
    if (stars[i][1] > 6) {
      stars[i][1] = Math.random() - 7; // Reset to the bottom
      stars[i][0] = Math.random() * 12 - 6; // Randomize horizontal position
    }
  }
}

function render(timestamp) {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  eye = vec3(0, 0, 10);
  MS = []; // Initialize modeling matrix stack

  // initialize the modeling matrix to identity
  modelMatrix = mat4();

  // set the camera matrix
  viewMatrix = lookAt(eye, at, up);

  // set the projection matrix
  projectionMatrix = ortho(left, right, bottom, ytop, near, far);

  // set all the matrices
  setAllMatrices();

  // draw stars
  drawStars();

  if (animFlag) {
    // dt is the change in time or delta time from the last frame to this one
    // in animation typically we have some property or degree of freedom we want to evolve over time
    // For example imagine x is the position of a thing.
    // To get the new position of a thing we do something called integration
    // the simpelst form of this looks like:
    // x_new = x + v*dt
    // That is, the new position equals the current position + the rate of of change of that position (often a velocity or speed) times the change in time
    // We can do this with angles or positions, the whole x,y,z position, or just one dimension. It is up to us!
    dt = (timestamp - prevTime) / 1000.0;
    prevTime = timestamp;
    TIME += dt;

    // Used to astronaut movement
    var oscillationX = Math.sin(TIME / 2) * 1;
    var oscillationY = Math.sin(TIME / 2) * 0.6;

    // Used for left and right arms
    var armRotation = Math.sin(TIME * 0.75) * 12;

    var orbitSpeed = 0.25; // Speed of the orbit for jelly
    var orbitRadius = 3.5; // Radius of jelly movement

    // Compute velocity direction
    var velocityX = -Math.sin(TIME * orbitSpeed); // The derivative of cos
    var velocityZ = Math.cos(TIME * orbitSpeed); // The derivative of sin

    var orbitX = Math.cos(TIME * orbitSpeed) * orbitRadius;
    var orbitZ = Math.sin(TIME * orbitSpeed) * orbitRadius;
    var orbitMath = -Math.atan2(velocityZ, velocityX) * (180 / Math.PI);

    var tentacleRotation = Math.sin(TIME) * 12; // Oscillates
  }

  //   // Sphere example
  //   gPush();
  //   // Put the sphere where it should be!
  //   gTranslate(spherePosition[0], spherePosition[1], spherePosition[2]);
  //   gPush();
  //   {
  //     // Draw the sphere!
  //     setColor(vec4(1.0, 0.0, 0.0, 1.0));
  //     drawSphere();
  //   }
  //   gPop();
  //   gPop();

  // Cube example
  //   gPush();
  //   gTranslate(cubePosition[0], cubePosition[1], cubePosition[2]);
  //   gPush();
  //   {
  //     setColor(vec4(0.0, 1.0, 0.0, 1.0));
  //     // Here is an example of integration to rotate the cube around the y axis at 30 degrees per second
  //     // new cube rotation around y = current cube rotation around y + 30deg/s*dt
  //     cubeRotation[1] = cubeRotation[1] + 30 * dt;
  //     // This calls a simple helper function to apply the rotation (theta, x, y, z),
  //     // where x,y,z define the axis of rotation. Here is is the y axis, (0,1,0).
  //     gRotate(cubeRotation[1], 0, 1, 0);
  //     drawCube();
  //   }
  //   gPop();
  //   gPop();

  // Cylinder example
  //   gPush();
  //   gTranslate(cylinderPosition[0], cylinderPosition[1], cylinderPosition[2]);
  //   gPush();
  //   {
  //     setColor(vec4(0.0, 0.0, 1.0, 1.0));
  //     cylinderRotation[1] = cylinderRotation[1] + 60 * dt;
  //     gRotate(cylinderRotation[1], 0, 1, 0);
  //     drawCylinder();
  //   }
  //   gPop();
  //   gPop();

  //Cone example
  //   gPush();
  //   gTranslate(conePosition[0], conePosition[1], conePosition[2]);
  //   gPush();
  //   {
  //     setColor(vec4(1.0, 1.0, 0.0, 1.0));
  //     coneRotation[1] = coneRotation[1] + 90 * dt;
  //     gRotate(coneRotation[1], 0, 1, 0);
  //     drawCone();
  //   }
  //   gPop();
  //   gPop();

  // TODO List:
  // fix stars

  gPush();

  // Move the astronaut to its designated position with added oscillation for movement
  gTranslate(
    astronautPosition[0] + oscillationX, // X-axis position with oscillation
    astronautPosition[1] + oscillationY, // Y-axis position with oscillation
    astronautPosition[2] // Z-axis position
  );

  // Rotate the astronaut around the Y-axis (left and right rotation)
  gRotate(astronautRotation[0], 0, 1, 0);

  // Astronaut Torso Details - Done
  gPush();
  {
    // Nasa Patch - Done
    gPush();
    {
      gTranslate(0.15, 0.5, 1); // Position button slightly forward on the torso
      gScale(1, 1, 1); // Reset any inherited scaling
      setColor(nasaColour); // Set button color (blue)
      gScale(0.15, 0.15, 0.025); // Adjust button size
      drawSphere(); // Render button as a sphere
    }
    gPop();

    // Various inlets/outlets - Done
    gPush();
    {
      gTranslate(0.25, 0.05, 1); // Top left btn
      setColor(vec4(0.0, 0.1, 0.9, 1.0)); // Set button color (blue)
      gScale(0.1, 0.1, 0.1); // Adjust button size
      drawSphere(); // Render button as a sphere
    }
    gPop();

    gPush();
    {
      gTranslate(0.55, 0.05, 1); // Top right btn
      setColor(vec4(0.0, 0.1, 0.9, 1.0)); // Set button color (blue)
      gScale(0.1, 0.1, 0.1); // Adjust button size
      drawSphere(); // Render button as a sphere
    }
    gPop();

    gPush();
    {
      gTranslate(0.15, -0.25, 1); // Middle left btn
      setColor(vec4(0.5, 0.5, 1.0, 1.0)); // Set button color (lavender)
      gScale(0.1, 0.1, 0.1); // Adjust button size
      drawSphere(); // Render button as a sphere
    }
    gPop();

    gPush();
    {
      gTranslate(0.65, -0.25, 1); // Middle right btn
      setColor(vec4(0.5, 0.5, 1.0, 1.0)); // Set button color (lavender)
      gScale(0.1, 0.1, 0.1); // Adjust button size
      drawSphere(); // Render button as a sphere
    }
    gPop();

    gPush();
    {
      gTranslate(0.2, -0.5, 1); // Bottom left btn
      setColor(vec4(1.0, 0.4, 0.0, 1.0)); // Set button color (orange)
      gScale(0.1, 0.1, 0.1); // Adjust button size
      drawSphere(); // Render button as a sphere
    }
    gPop();

    gPush();
    {
      gTranslate(0.6, -0.5, 1); // Bottom right btn
      setColor(vec4(1.0, 0.4, 0.0, 1.0)); // Set button color (orange)
      gScale(0.1, 0.1, 0.1); // Adjust button size
      drawSphere(); // Render button as a sphere
    }
    gPop();

    // Left leg upper - Done
    gPush();
    {
      gTranslate(-0.3, -1.11, 0); // Upper left leg pos
      let upperLegRotation = Math.max(0, Math.abs(Math.sin(TIME / 2)) * 30); // Calculate the upper leg rotation angle
      gRotate(upperLegRotation, 1, 0, 0); // Rotate the upper leg around the X-axis
      gTranslate(0, -0.25, -0.15);
      setColor(bodyColour); // Set leg color
      gScale(0.165, 0.55, 0.165); // Adjust leg size
      drawCube(); // Render leg as a cube

      // Left leg lower - Done

      gPush();
      {
        gTranslate(0, -1.7, 0.1); // Lower right pos
        let lowerLegRotation = Math.max(20, Math.abs(Math.sin(TIME / 2)) * 60); // Calculate the lower leg rotation angle
        gRotate(lowerLegRotation, 1, 0, 0); // Rotate the lower leg around the X-axis
        gTranslate(0, 0, -0.55);
        gScale(1, 1, 0.8);
        drawCube(); // Render leg as a cube

        // Left foot - Done
        gPush();
        {
          gTranslate(0, -1, 0.5); // Left foot pos
          gScale(1, 0.1, 1.5); // Set foor size
          drawCube(); // Render foot as a cube
        }
        gPop();
      }
      gPop();
    }
    gPop();

    // Right leg upper - Done
    gPush();
    {
      gTranslate(0.3, -1.11, 0.1); // Upper right leg pos
      let upperLegRotation = Math.max(0, Math.abs(Math.cos(TIME / 2)) * 30); // Calculate the upper leg rotation angle
      gRotate(upperLegRotation, 1, 0, 0); // Rotate the upper leg around the X-axis
      gTranslate(0, -0.25, -0.1); // Adjusting to rotation

      setColor(bodyColour); // Set leg colour
      gScale(0.165, 0.55, 0.165); // Adjust leg size
      drawCube(); // Render leg as a cube

      // Right leg lower - Done
      gPush();
      {
        gTranslate(0, -1.7, 0.1); // Lower right pos
        let lowerLegRotation = Math.max(20, Math.abs(Math.cos(TIME / 2)) * 60); // Calculate the lower leg rotation angle
        gRotate(lowerLegRotation, 1, 0, 0); // Rotate the lower leg around the X-axis
        gTranslate(0, 0, -0.55);
        gScale(1, 1, 0.8);
        drawCube(); // Render leg as a cube

        // Right foot - Done
        gPush();
        {
          gTranslate(0, -1, 0.5); // Right foot pos
          gScale(1, 0.1, 1.5); // Set foot size
          drawCube(); // Render foot as a cube
        }
        gPop();
      }
      gPop();
    }
    gPop();

    // Torso implementation - Done
    setColor(vec4(1.0, 1.0, 1.0, 1.0)); // Set body color to white
    gScale(0.55, 0.8, 0.25); // Scale the body to fit astronaut proportions
    drawCube(); // Render the body as a rectangular cube
  }
  gPop();

  // Helmet - Done
  gPush();
  {
    gTranslate(0, 1.15, 0); // Position the helmet above the body
    setColor(bodyColour); // Set helmet color to white
    gScale(0.42, 0.42, 0.42); // Scale the helmet to a sphere shape
    drawSphere(); // Render the helmet as a sphere
  }
  gPop();

  // Helmet Visor - Done
  gPush();
  {
    gTranslate(0, 1.15, 0.2); // Position the visor slightly forward on the helmet
    setColor(vec4(1, 0.7, 0.1, 1.0)); // Set visor color to yellow
    gScale(0.42, 0.32, 0.3); // Adjust visor size
    drawSphere(); // Render the visor as a sphere
  }
  gPop();

  // Left arm - Done
  gPush();
  {
    gTranslate(0.9, 0.2, 0); // Position the left arm relative to the body
    gRotate(40 + armRotation, 0, 0, 1); // Rotate arm for a swinging effect
    gPush();
    {
      gTranslate(0, -armHeight / 2, 0); // Move to the center of the arm
      gScale(armWidth, armHeight, armDepth); // Scale to match arm dimensions
      setColor(bodyColour); // Set arm colour
      drawCube();
    }
    gPop();
  }
  gPop();

  // Right arm - Done
  // Similar to the left arm but mirrored
  gPush();
  {
    gTranslate(-0.9, 0.2, 0); // Position the right arm
    gRotate(-40 + armRotation, 0, 0, 1); // Rotate in the opposite direction
    gPush();
    {
      gTranslate(0, -armHeight / 2, 0); // Move to the center of the arm
      gScale(armWidth, armHeight, armDepth); // Scale to match arm dimensions
      setColor(bodyColour); // Set arm colour
      drawCube();
    }
    gPop();
  }
  gPop();

  // END OF ASTRONAUT

  // Space Jelly
  gPop();
  gPush();
  {
    gTranslate(orbitX, 1, orbitZ); // Put the jelly in orbit
    gRotate(orbitMath, 0, 1, 0); // Apply orbit rotation
    gPush();
    {
      gScale(0.45, 0.9, 0.9); // Set the size of main body
      setColor(jellyColour); // Pink colour
      drawSphere();
    }
    gPop();
    gPush();
    {
      gTranslate(-0.5, 0, 0); // Position sub-body
      gPush();
      {
        gScale(0.325, 0.65, 0.65); // Set the size of sub-body
        drawSphere();
      }
      gPop();
    }
    gPop();
    gPush();
    {
      gTranslate(-1, 0.5, 0); // Adjust segment location
      gPush();
      {
        gScale(0.3, 0.15, 0.15); // Set segment size
        setColor(vec4(1, 0.7, 0.1, 1.0)); // Set segment colour
        drawSphere(); // Segment 1
      }
      gPop();
      gPush();
      {
        gTranslate(-0.6, 0, 0); //Adjust
        gRotate(tentacleRotation, 0, 0, 1);
        gPush();
        {
          gScale(0.3, 0.15, 0.15);
          drawSphere(); // Segment 2
          gPush();
          {
            gTranslate(-0.6, 0, 0);
            gRotate(10 + tentacleRotation, 0, 0, 1);
            gPush();
            {
              gTranslate(-1.2, 0, 0);
              drawSphere(); // Segment 3
              gPush();
              {
                gTranslate(-1.8, 0, 0);
                gRotate(10 + tentacleRotation, 0, 0, 1);
                gPush();
                {
                  drawSphere(); // Segment 4
                  gPush();
                  {
                    gTranslate(-1.8, 0, 0);
                    gRotate(10 + tentacleRotation, 0, 0, 1);
                    gPush();
                    {
                      drawSphere(); // Segment 5
                    }
                    gPop();
                  }
                  gPop();
                }
                gPop();
              }
              gPop();
            }
            gPop();
          }
          gPop();
        }
        gPop();
      }
      gPop(); // Pop back
      gPush();
      {
        gTranslate(0, -0.5, 0); //Adjust
        gPush();
        {
          gScale(0.3, 0.15, 0.15); // Set segment size
          setColor(vec4(1, 0.7, 0.1, 1.0)); // Set segment colour
          drawSphere(); // Segment 1
        }
        gPop();
        gPush();
        {
          gTranslate(-0.6, 0, 0);
          gRotate(tentacleRotation, 0, 0, 1);
          gPush();
          {
            gScale(0.3, 0.15, 0.15);
            drawSphere(); // Segment 2
            gPush();
            {
              gTranslate(-0.6, 0, 0);
              gRotate(10 + tentacleRotation, 0, 0, 1);
              gPush();
              {
                gTranslate(-1.2, 0, 0);
                drawSphere(); // Segment 3
                gPush();
                {
                  gTranslate(-1.8, 0, 0);
                  gRotate(10 + tentacleRotation, 0, 0, 1);
                  gPush();
                  {
                    drawSphere(); // Segment 4
                    gPush();
                    {
                      gTranslate(-1.8, 0, 0);
                      gRotate(10 + tentacleRotation, 0, 0, 1);
                      gPush();
                      {
                        drawSphere(); // Segment 5
                      }
                      gPop();
                    }
                    gPop();
                  }
                  gPop();
                }
                gPop();
              }
              gPop();
            }
            gPop();
          }
          gPop();
        }
        gPop();
      }
      gPop(); // Pop back
      gPush();
      {
        gTranslate(0, -1, 0);
        gPush();
        {
          gScale(0.3, 0.15, 0.15); // Set segment size
          setColor(vec4(1, 0.7, 0.1, 1.0)); // Set segment colour
          drawSphere(); // Segment 1
        }
        gPop();
        gPush();
        {
          gTranslate(-0.6, 0, 0);
          gRotate(tentacleRotation, 0, 0, 1);
          gPush();
          {
            gScale(0.3, 0.15, 0.15);
            drawSphere(); // Segment 2
            gPush();
            {
              gTranslate(-0.6, 0, 0);
              gRotate(10 + tentacleRotation, 0, 0, 1);
              gPush();
              {
                gTranslate(-1.2, 0, 0);
                drawSphere(); // Segment 3
                gPush();
                {
                  gTranslate(-1.8, 0, 0);
                  gRotate(10 + tentacleRotation, 0, 0, 1);
                  gPush();
                  {
                    drawSphere(); // Segment 4
                    gPush();
                    {
                      gTranslate(-1.8, 0, 0);
                      gRotate(10 + tentacleRotation, 0, 0, 1);
                      gPush();
                      {
                        drawSphere(); // Segment 5
                      }
                      gPop();
                    }
                    gPop();
                  }
                  gPop();
                }
                gPop();
              }
              gPop();
            }
            gPop();
          }
          gPop();
        }
        gPop();
      }
      gPop();
    }
    gPop();
  }
  gPop();

  // Repeats 3 times for each tentacle
  // Should be in a function and called here instead of repeating code.

  // === Animation Loop ===
  if (animFlag) window.requestAnimFrame(render); // Continuously update animation if animFlag is true
}
