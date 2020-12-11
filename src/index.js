/**
 * @file This script is an interactive optics simulator displaying the path of light refracted through a prism
 * interfacing with a liquid with the purpose of displaying the critical angle of a given sample and how it
 * varies when changing the given parameters. It's based on Pixi.js 2D graphics library
 * @author Paolo Infante
 * @link https://www.paoloinfante.it/blog/
 * @copyright (c) Paolo Infante 2020
 *
 * @license
 * This script is free to use, share, modify, as described by the following license (FreeBSD).
 * A tiny attribution is appreciated!
 *
 * Copyright (c) 2020, Paolo Infante
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice,
 * this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 * this list of conditions and the following disclaimer in the documentation and/or
 * other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
 * EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import * as PIXI from "pixi.js";
import hljs from "highlight.js";
import javascript from "highlight.js/lib/languages/javascript";
import "highlight.js/styles/github.css";
import { CONFIG_KEYS, getConfigParameter, setConfigParameter } from "./config";
import "./style/main.css";

/////////////////////// DEBUG UTILITITES DEFINITIONS ////////////////////////////////////////////

const printLine = (line) => console.log(`y = ${MathEq.mCoeff(line)} x + ${MathEq.cCoeff(line)}`);

///////////////////////////// HTML ELEMENTS /////////////////////////////////////////////////

const nRaysEl = document.getElementById("numRays");
const numRaysDisplayEl = document.getElementById("numRaysDisplay");
nRaysEl.addEventListener("change", raysNumberChanged);

const raysAngleEl = document.getElementById("raysAngle");
const raysAnglesDisplayEl = document.getElementById("raysAnglesDisplay");
raysAngleEl.addEventListener("change", raysAngleChanged);

const nSampleEl = document.getElementById("nSample");
const nSampleDisplayEl = document.getElementById("nSampleDisplay");
nSampleEl.addEventListener("change", nSampleChanged);

const nPrismEl = document.getElementById("nPrism");
const nPrismDisplayEl = document.getElementById("nPrismDisplay");
nPrismEl.addEventListener("change", nPrismChanged);

///////////////////////////////// PARAMETERS ////////////////////////////////////////////////

const WIDTH = 800;
const HEIGHT = 800;
const H_WIDTH = WIDTH / 2,
    H_HEIGHT = HEIGHT / 2;

const RAY_COLOR = 0xffffff;
const RAY_DIM_COLOR = 0x444444;

const nAir = 1;

// Load previous values if there's any (implemented through localStorage API)
let nPrism = getConfigParameter(CONFIG_KEYS.PRISM_RI, 1.5046);
let nSample = getConfigParameter(CONFIG_KEYS.SAMPLE_RI, 1.3);
let numRays = getConfigParameter(CONFIG_KEYS.RAYS_NUM, 80);
let raysDeltaAngle = getConfigParameter(CONFIG_KEYS.RAYS_ANGLE, 3);

nRaysEl.value = numRays;
numRaysDisplayEl.innerText = numRays;
raysAngleEl.value = raysDeltaAngle;
raysAnglesDisplayEl.innerText = raysDeltaAngle;
nSampleEl.value = parseFloat(nSample) * 10000;
nSampleDisplayEl.innerText = parseFloat(nSample).toFixed(4);
nPrismEl.value = parseFloat(nPrism) * 10000;
nPrismDisplayEl.innerText = parseFloat(nPrism).toFixed(4);

const cmToPx = (cm) => Math.round(cm * 25);

const prismSides = cmToPx(15);
const prismHypo = Math.round(prismSides * Math.SQRT2);
const prismHypoHalf = Math.round(prismHypo / 2);
let lightPosition = JSON.parse(getConfigParameter(CONFIG_KEYS.LIGHT_POS, JSON.stringify([60, 124])));

const PRISM = [
    [H_WIDTH - prismHypoHalf, 20],
    [H_WIDTH + prismHypoHalf, 20],
    [H_WIDTH, 20 + prismHypoHalf],
];

// Geometry and linear algebra
const PI_half = Math.PI / 2;
const _2PI = 2 * Math.PI;
const MathEq = {
    mCoeff: (fun) => fun(1) - fun(0),
    cCoeff: (fun) => fun(0),
    lineEquation: (x1, y1, x2, y2) => (x) => ((y2 - y1) / (x2 - x1)) * (x - x1) + y1,
    lineFromPointPerpenticularToLine: (lineEquation, xp, yp) => (x) => (-1 / MathEq.mCoeff(lineEquation)) * (x - xp) + yp,
    lineFromPointAndMCoeff: (xp, yp, m) => (x) => m * (x - xp) + yp,
    intersection: (line1, line2) => {
        // y = ax + b
        // y = a'x + b'
        // ax + b = a'x + b'
        // x (a - a') = b' - b
        // x = (b' - b) / (a - a')
        const x = (MathEq.cCoeff(line2) - MathEq.cCoeff(line1)) / (MathEq.mCoeff(line1) - MathEq.mCoeff(line2));
        const y = line1(x);
        return [x, y];
    },
    normalAngle: (line1, line2) => {
        const m1 = MathEq.mCoeff(line1),
            m2 = MathEq.mCoeff(line2);
        let angle = Math.atan((m1 - m2) / (1 + m1 * m2));
        angle = angle > 0 ? PI_half - angle : -PI_half - angle;
        return angle;
    },
    angleBetweenTwoLines: (line1, line2) => {
        const m1 = MathEq.mCoeff(line1),
            m2 = MathEq.mCoeff(line2);
        return Math.atan((m1 - m2) / (1 + m1 * m2));
    },
    isInBounds: (xp, yp, x1, y1, x2, y2) => {
        const TOLERANCE = 1; // 1 px per side
        const lowerX = Math.min(x1, x2) - TOLERANCE;
        const higherX = Math.max(x1, x2) + TOLERANCE;
        const lowerY = Math.min(y1, y2) - TOLERANCE;
        const higherY = Math.max(y1, y2) + TOLERANCE;
        return xp >= lowerX && xp <= higherX && yp >= lowerY && yp <= higherY;
    },
};

// Vector algebra
const MathVec = {
    rotate2d: (x, y, angle) => {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return [x * cos - y * sin, x * sin + y * cos];
    },
};

/////////////////////////////////////// SETUP ///////////////////////////////////////////////////////

const app = new PIXI.Application({
    width: WIDTH,
    height: HEIGHT,
    antialias: true,
});

document.getElementById("render-container").appendChild(app.view);
const mainContainer = new PIXI.Graphics();
const lightObject = new PIXI.Graphics();

///////////////////////////////// INTERACTION HANDLERS //////////////////////////////////////////////

let mouseStartData;
let mouseInteracting = false;
let rerenderTimeout;

function pointLightDragStart(e) {
    mouseStartData = e.data;
    mouseInteracting = true;
}
function pointLightDragEnd(e) {
    mouseInteracting = false;
}
function pointLightDragMove(e) {
    if (mouseInteracting) {
        const newPos = e.data.getLocalPosition(mainContainer);
        lightPosition = [newPos.x, newPos.y];
        setConfigParameter(CONFIG_KEYS.LIGHT_POS, JSON.stringify(lightPosition));
        clearTimeout(rerenderTimeout);
        rerenderTimeout = setTimeout(() => requestAnimationFrame(DrawScene), 25);
    }
}
function raysNumberChanged(event) {
    const newVal = parseInt(event.target.value);

    if (newVal >= 5 && newVal <= 100) {
        numRays = newVal;
        numRaysDisplayEl.innerText = newVal;
        setConfigParameter(CONFIG_KEYS.RAYS_NUM, newVal);
        clearTimeout(rerenderTimeout);
        rerenderTimeout = setTimeout(() => requestAnimationFrame(DrawScene), 25);
    }
}
function raysAngleChanged(event) {
    const newVal = parseInt(event.target.value);

    if (newVal >= 1 && newVal <= 45) {
        raysDeltaAngle = newVal;
        raysAnglesDisplayEl.innerText = newVal;
        setConfigParameter(CONFIG_KEYS.RAYS_ANGLE, newVal);
        clearTimeout(rerenderTimeout);
        rerenderTimeout = setTimeout(() => requestAnimationFrame(DrawScene), 25);
    }
}
function nSampleChanged(event) {
    const newVal = parseInt(event.target.value) / 10000;

    if (newVal >= 1 && newVal < nPrism) {
        nSample = newVal;
        nSampleDisplayEl.innerText = newVal.toFixed(4);
        setConfigParameter(CONFIG_KEYS.SAMPLE_RI, newVal);
        clearTimeout(rerenderTimeout);
        rerenderTimeout = setTimeout(() => requestAnimationFrame(DrawScene), 25);
    }
}
function nPrismChanged(event) {
    const newVal = parseInt(event.target.value) / 10000;

    if (newVal > nSample) {
        nPrism = newVal;
        nPrismDisplayEl.innerText = newVal.toFixed(4);
        setConfigParameter(CONFIG_KEYS.PRISM_RI, newVal);
        clearTimeout(rerenderTimeout);
        rerenderTimeout = setTimeout(() => requestAnimationFrame(DrawScene), 25);
    }
}

///////////////////////////////////// RENDER FUNCTION /////////////////////////////////////////////////

function DrawScene() {
    console.log("DRAW_SCENE");
    const criticalAngle = Math.asin(nSample / nPrism);
    // Prism faces line equations
    const prismFrontFace = MathEq.lineEquation(H_WIDTH - prismHypoHalf, 20, H_WIDTH, 20 + prismHypoHalf);
    const prismTopFace = MathEq.lineEquation(H_WIDTH - prismHypoHalf, 20, H_WIDTH + prismHypoHalf, 20);
    const prismBackFace = MathEq.lineEquation(H_WIDTH + prismHypoHalf, 20, H_WIDTH, 20 + prismHypoHalf);

    const lightNormal = MathEq.lineFromPointPerpenticularToLine(prismFrontFace, ...lightPosition);

    /////////////////////////////////////////////////////////////////////////////////////////////////

    mainContainer.clear();
    lightObject.clear();

    mainContainer.lineStyle(3, 0xffffff, 1);
    mainContainer.drawPolygon(...PRISM[0], ...PRISM[1], ...PRISM[2]);

    lightObject.lineStyle(0, 0xffffff, 1);
    lightObject.beginFill(0xffffff);
    lightObject.drawCircle(0, 0, 3);
    lightObject.endFill();
    lightObject.x = lightPosition[0];
    lightObject.y = lightPosition[1];
    lightObject.interactive = true;
    lightObject.buttonMode = true;
    lightObject
        .on("mousedown", pointLightDragStart)
        .on("mouseup", pointLightDragEnd)
        .on("mouseupoutside", pointLightDragEnd)
        .on("mousemove", pointLightDragMove);
    mainContainer.addChild(lightObject);

    // The approach is geometric rather than vectorial
    const _angleRad = (Math.PI / 180) * raysDeltaAngle;

    const lightIncidentPoint = MathEq.intersection(prismFrontFace, lightNormal);

    mainContainer.lineStyle(2, RAY_COLOR, 1);

    const incidentPoints = [];
    const attackAngles = [];
    const refractionAngles = [];

    // Lines from light source to prism front face
    for (let i = -Math.floor(numRays / 2); i < Math.ceil(numRays / 2); i++) {
        // Start from our light position
        mainContainer.moveTo(...lightPosition);
        // Rotate the incident point of the perpendicular ray from the light position
        const rotatedPoint = MathVec.rotate2d(lightIncidentPoint[0] - lightPosition[0], lightIncidentPoint[1] - lightPosition[1], i * _angleRad);
        rotatedPoint[0] += lightIncidentPoint[0];
        rotatedPoint[1] += lightIncidentPoint[1];
        // Build a line from the light source to the point
        const rotatedLine = MathEq.lineEquation(...lightPosition, ...rotatedPoint);
        // Get the intersection with the prism face
        const point = MathEq.intersection(prismFrontFace, rotatedLine);

        if (MathEq.isInBounds(...point, ...PRISM[0], ...PRISM[2])) {
            incidentPoints.push(point);
            attackAngles.push(MathEq.normalAngle(rotatedLine, prismFrontFace));
            refractionAngles.push(Math.asin((attackAngles[attackAngles.length - 1] * nAir) / nPrism));
            mainContainer.lineTo(...point);
        }
    }

    const reflectionPoints = [];
    const reflectionAngles = [];
    const frontFaceNormalAngle = Math.atan(MathEq.mCoeff(lightNormal));
    const isTotalIntRefl = [];

    // Lines refracted from the front face towards the top face
    refractionAngles.forEach((refAngle, i) => {
        mainContainer.lineStyle(2, isTotalIntRefl[i] ? RAY_COLOR : RAY_DIM_COLOR, 1);
        mainContainer.moveTo(...incidentPoints[i]);
        const refractedLine = MathEq.lineFromPointAndMCoeff(...incidentPoints[i], Math.tan(frontFaceNormalAngle - refAngle));
        const reflPoint = MathEq.intersection(refractedLine, prismTopFace);

        if (MathEq.isInBounds(...reflPoint, ...PRISM[0], ...PRISM[1])) {
            mainContainer.lineTo(...reflPoint);
            reflectionPoints.push(reflPoint);
            reflectionAngles.push(MathEq.normalAngle(prismTopFace, refractedLine));
            isTotalIntRefl.push(reflectionAngles[reflectionAngles.length - 1] > criticalAngle ? true : false);
        }
    });

    // At this point rays are partially refracted and partially reflected until the critical angle is reached
    // where the rays are totally reflected. We display only the reflections, with a different color to
    // show which rays are dimmer (partial reflection) and which ones are brighter (total internal reflection)

    const topFaceNormalAngle = PI_half;
    const refraction2Points = [];
    const attack2Angles = [];
    const refraction2Angles = [];

    const removedPoints = [];

    reflectionAngles.forEach((reflAngle, i) => {
        mainContainer.lineStyle(2, isTotalIntRefl[i] ? RAY_COLOR : RAY_DIM_COLOR, 1);
        mainContainer.moveTo(...reflectionPoints[i]);
        const reflectedLine = MathEq.lineFromPointAndMCoeff(...reflectionPoints[i], Math.tan(topFaceNormalAngle - reflAngle));
        const refrPoint = MathEq.intersection(reflectedLine, prismBackFace);

        if (MathEq.isInBounds(...refrPoint, ...PRISM[1], ...PRISM[2])) {
            mainContainer.lineTo(...refrPoint);
            refraction2Points.push(refrPoint);
            attack2Angles.push(MathEq.normalAngle(prismBackFace, reflectedLine));
            refraction2Angles.push(Math.asin((attack2Angles[attack2Angles.length - 1] * nPrism) / nAir));
        } else {
            removedPoints.push(i);
        }
    });

    // Remove points from the indexed array that have been discarded from the reflection
    removedPoints
        .sort((a, b) => b - a)
        .forEach((v) => {
            isTotalIntRefl.splice(v, 1);
        });

    const backFaceNormalAngle = PI_half / 2;
    refraction2Angles.forEach((refr2Angle, i) => {
        mainContainer.lineStyle(2, isTotalIntRefl[i] ? RAY_COLOR : RAY_DIM_COLOR, 1);
        mainContainer.moveTo(...refraction2Points[i]);
        const refr2Line = MathEq.lineFromPointAndMCoeff(...refraction2Points[i], Math.tan(backFaceNormalAngle + refr2Angle));

        // Right boundary is the point that has the canvas WIDTH as x value
        const refr2Point = [WIDTH, refr2Line(WIDTH)];

        mainContainer.lineTo(...refr2Point);
    });

    const ft = new PIXI.Text("github.com/paolo-projects/refractometer-simulation", { fontFamily: "Century Gothic", fontSize: 10, fill: 0xffffff });
    ft.x = 540;
    ft.y = 780;
    mainContainer.addChild(ft);

    mainContainer.x = 0;
    mainContainer.y = 0;
    app.stage.addChild(mainContainer);
}

DrawScene();

//////////////////////////////////////////////// SOURCE CODE RELATED STUFF ////////////////////////////////////

const sourceDialog = document.getElementById("source-code-dialog");

document.getElementById("source-code-open").addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    sourceDialog.classList.add("visible");
});
document.getElementById("source-code-close").addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    sourceDialog.classList.remove("visible");
});

window.addEventListener("load", () => {
    hljs.registerLanguage("javascript", javascript);
    hljs.initHighlighting();
});
