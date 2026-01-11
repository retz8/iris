import * as T from "three";
import { PLYLoader as L1 } from "three/examples/jsm/loaders/PLYLoader.js";
import { OBJExporter as L2 } from "three/examples/jsm/exporters/OBJExporter.js";
import rtf from "./rotation_of_the_frame.js";

import { createGUIWithAnth as g0 } from "./modules/guiManager.js";
import { createManualWheelchair as g1 } from "./modules/manualWheelchair.js";
import { createPoweredWheelchair as g2 } from "./modules/poweredWheelchair.js";

import LM from "./modules/licenseManager.js";
import { ASCIIStlWriter as W0, ASCIILMWriter as W1, ASCIIAnthroWriter as W2 } from "./modules/asciiWriters.js";
import SM from "./modules/sceneManager.js";

import { showLoadingSymbol as s0, hideLoadingSymbol as s1 } from "./utils/loader.js";
import { dotProduct as u0 } from "./utils/matrixCalculation.js";
import { getDateNow as u1 } from "./utils/date.js";
import { CSVToArray as u2 } from "./utils/csvParser.js";
import { createAxes as d0, removeAxesFromScene as d1 } from "./utils/3dDebugger.js";
import { inToM as c0, mmToM as c1, mToIn as c2 } from "./utils/unitConverter.js";
import { CSG2Geom as k0, updateGeometryWithCSGData as k1 } from "./utils/csgHelper.js";
import { saveAs } from "./js/FileSaver.js";
import { getMeshCenterLine as m0, calculateDistanceBetweenPoints as m1, getHumanModelWorldCoordinates as m2 } from "./utils/meshUtils.js";

let a0, a1, a2, a3, a4 = [], a5 = false, a6, a7 = 0, a8 = 0;
let b0, b1, b2, b3 = false, b4, b5 = "manual";
let s, ctr;
let f0 = false;

const v0 = new T.Vector3(0, 0, 0);
const v1 = new T.Vector3(-73 * Math.PI / 180, 0, 90 * Math.PI / 180);
const v2 = new T.Vector3(-Math.PI / 2, 0, -Math.PI / 2);

const sm = new SM();
const lm = new LM();

const p = new (function () {
  this.A = 1;
  this.B = 1;
  this.C = 1700;
  this.D = 26;
  this.E = 0.52;
  this.F = 40;
  this.G = false;
  this.H = "obj";
  this.I = "BioHuman";
  this.J = "manual";
  this.K = 100;
  this.L = 18;
  this.M = 18;
  this.N = 20;
  this.O = 21;
  this.P = 3;
  this.Q = 4;
  this.R = 75;
  this.S = 24;
  this.T = 0;
  this.U = 5;
  this.V = 12;
  this.W = 0;
  this.X = 0;

  this.Y = function () {
    if (!lm.checkLicense()) return;
    if (this.H === "stl") {
      const w = new W0();
      if (a3) w.saveGeometryAsSTL(a3, this.I + "_model.stl");
      if (b1) {
        q0(ctr.target.x, ctr.target.y, ctr.target.z, b4, () => {});
        w.saveGeometryAsSTL(b1, this.I + "_wheelchair.stl");
      }
    } else {
      if (a3) {
        const o = new T.Mesh(a3, new T.MeshBasicMaterial());
        const e = new L2().parse(o);
        saveAs(new Blob([e]), this.I + "_model.obj");
      }
      if (b1) {
        q0(ctr.target.x, ctr.target.y, ctr.target.z, b4, () => {});
        const o = new T.Mesh(b1, new T.MeshBasicMaterial());
        const e = new L2().parse(o);
        saveAs(new Blob([e]), this.I + "_wheelchair.obj");
      }
    }
  };

  this.Z = function () {
    if (!lm.checkLicense()) return;
    new W1(p).saveLandmarksAsCSV(a1, this.I + "_" + u1() + "_lm.csv");
  };

  this.$ = function () {
    if (!lm.checkLicense()) return;
    new W2(p).saveAnthDataAsCSV(a1, this.I + "_" + u1() + "_anth.csv");
  };
})();

const gui = g0(p, () => (a5 = true), () => (b3 = true));

function h0(m) {
  const d = m1(m, 1359, 3264, true, false, false);
  return c2(d) + 2;
}

function h1(m) {
  const w = m2(m, 2225);
  const s = c0(b4.seatPanHeight + b4.seatCushThick);
  return c2(Math.abs(w.z - s));
}

function h2() {
  let r = { ...b4 };
  r.seatWidth = h0(a2);
  r.seatBackHeight = h1(a2);
  return r;
}

function q0(x, y, z, p0, cb) {
  b2 = new T.MeshPhongMaterial({ color: 0xaaffff });
  const g = b5 === "powered" ? g2(p0) : g1(p0);
  b1 = new T.Mesh(k0(g), b2);
  b1.position.set(x, y, z);
  b1.scale.set(0.001, 0.001, 0.001);
  b1.rotation.set(v2.x, v2.y, v2.z);
  s.add(b1);
  cb && cb();
}

function r0(file, x, y, z, cb) {
  new L1().load(file, (g) => {
    a3 = g;
    a6 = new T.MeshPhongMaterial({ color: 0xffffff, transparent: true });
    a2 = new T.Mesh(g, a6);
    a2.rotation.set(v1.x, v1.y, v1.z);
    a2.position.set(x, y, z);
    a2.scale.set(0.001, 0.001, 0.001);
    s.add(a2);
    cb && cb();
  });
}

function init(data) {
  sm.setup();
  s = sm.getScene();
  ctr = sm.getControls();
  a1 = data;
  r0("model/mean_model_tri.ply", 0, 0, 0, () => {});
  q0(0, 0, 0, b4, () => {});
}

function loop() {
  requestAnimationFrame(loop);
  sm.render();
}

$(document).ready(() => {
  $.get("model/Anth2Data.csv", (d) => {
    init(u2(d));
    loop();
  });
});

