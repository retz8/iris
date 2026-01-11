import * as THREE from "three";
import { PLYLoader } from "three/examples/jsm/loaders/PLYLoader.js";
import { OBJExporter } from "three/examples/jsm/exporters/OBJExporter.js";
import rotatingFrameTransformation from "./rotation_of_the_frame.js";

import { createGUIWithAnth } from "./modules/guiManager.js";
import { createManualWheelchair } from "./modules/manualWheelchair.js";
import { createPoweredWheelchair } from "./modules/poweredWheelchair.js";

import LicenseManager from "./modules/licenseManager.js";
import {
  ASCIIStlWriter,
  ASCIILMWriter,
  ASCIIAnthroWriter,
} from "./modules/asciiWriters.js";
import SceneManager from "./modules/sceneManager.js";

import { showLoadingSymbol, hideLoadingSymbol } from "./utils/loader.js";
import { dotProduct } from "./utils/matrixCalculation.js";
import { getDateNow } from "./utils/date.js";
import { CSVToArray } from "./utils/csvParser.js";
import {
  createDebugMesh,
  createBoundingBox,
  createAxes,
  removeAxesFromScene,
} from "./utils/3dDebugger.js";
import { inToM, mmToM, mToIn } from "./utils/unitConverter.js";
import { CSG2Geom, updateGeometryWithCSGData } from "./utils/csgHelper.js";
import { saveAs } from "./js/FileSaver.js";
import {
  getMeshCenterLine,
  calculateDistanceBetweenPoints,
  getHumanModelWorldCoordinates,
} from "./utils/meshUtils.js";

var material;
var PCAdata;
var humanMesh;
var humanGeometry;
var geometryZero = [];
var humanParameterChanged = false;
var humanMaterial;
var predAnthNum = 0;
var predLandmarkNum = 0;

var wheelchairMesh;
var wheelchairGeometry;
var wheelchairMaterial;
let wheelchairParameterChanged = false;
var wheelchairParams;
var wheelchairType = "manual";

let scene, controls;
var showAxes = false;

var centerPoint = new THREE.Vector3(0, 0, 0);

var humanRotation = new THREE.Vector3(
  -73 * (Math.PI / 180),
  0,
  90 * (Math.PI / 180)
);
var wheelchairRotation = new THREE.Vector3(-Math.PI / 2, 0, -Math.PI / 2);

const sceneManager = new SceneManager();
const licenseManager = new LicenseManager();

var anth = new (function () {
  this.STUDY = 1;
  this.GENDER = 1;
  this.STATURE = 1700;
  this.BMI = 26;
  this.SHS = 0.52;
  this.AGE = 40;
  this.LandmarkView = false;
  this.FileType = "obj";
  this.FileName = "BioHuman";
  this.WHEELCHAIR_TYPE = "manual";
  this.OPACITY = 100;

  this.SEATWIDTH = 18;
  this.SEATDEPTH = 18;
  this.SEATPANHEIGHT = 20;
  this.SEATBACKHEIGHT = 21;
  this.CAMBER = 3;
  this.LEGLEN = 4;
  this.LEGRESTANG = 75;
  this.WHEELDIAMETER = 24;

  this.SEAT_ANGLE = 0;
  this.RECLINE_ANGLE = 5;
  this.LARGE_WHEEL_DIAMETER = 12;
  this.LEG_REST_ANGLE = 0;
  this.DRIVER_WHEEL_POS = 0;

  this.ExportHumanGeometry = function () {
    if (!licenseManager.checkLicense()) return;

    if (this.FileType === "stl") {
      const stlWriter = new ASCIIStlWriter();

      if (humanGeometry) {
        stlWriter.saveGeometryAsSTL(
          humanGeometry,
          this.FileName + "_model.stl"
        );
      }

      if (wheelchairGeometry) {
        loadWheelchairModel(
          controls.target.x,
          controls.target.y,
          controls.target.z,
          wheelchairParams,
          () => {}
        );
        stlWriter.saveGeometryAsSTL(
          wheelchairGeometry,
          this.FileName + "_wheelchair.stl"
        );
      }
    } else if (this.FileType === "obj") {
      if (humanGeometry) {
        let humanObjectToExport = createExportableObject(humanGeometry);
        var humanExporter = new OBJExporter();
        var humanObjString = humanExporter.parse(humanObjectToExport);
        var humanBlob = new Blob([humanObjString], { type: "text/plain" });
        saveAs(humanBlob, this.FileName + "_model.obj");
      }

      if (wheelchairGeometry) {
        loadWheelchairModel(
          controls.target.x,
          controls.target.y,
          controls.target.z,
          wheelchairParams,
          () => {}
        );
        let wheelchairObjectToExport =
          createExportableObject(wheelchairGeometry);
        var wheelchairExporter = new OBJExporter();
        var wheelchairObjString = wheelchairExporter.parse(
          wheelchairObjectToExport
        );
        var wheelchairBlob = new Blob([wheelchairObjString], {
          type: "text/plain",
        });
        saveAs(wheelchairBlob, this.FileName + "_wheelchair.obj");
      }
    }

    function createExportableObject(geometry) {
      if (
        !geometry ||
        !(geometry instanceof THREE.BufferGeometry)
      ) {
        console.error("Invalid or undefined geometry.");
        return null;
      }

      let material = new THREE.MeshBasicMaterial();
      return new THREE.Mesh(geometry, material);
    }

    var parametervalue =
      "p" +
      this.STUDY.toFixed() +
      "_" +
      this.GENDER.toFixed() +
      "_" +
      this.STATURE.toFixed() +
      "_" +
      this.BMI.toFixed(1) +
      "_" +
      this.SHS.toFixed(2) +
      "_" +
      this.AGE.toFixed();

    gtag("event", "Model_Download", {
      event_category: "Adult_Seated",
      event_label: parametervalue,
    });
  };

  this.ExportHumanLandmarksCSV = function () {
    if (!licenseManager.checkLicense()) return;

    const landmarkWriter = new ASCIILMWriter(anth);
    landmarkWriter.saveLandmarksAsCSV(
      PCAdata,
      this.FileName + "_" + getDateNow() + "_landmark.csv"
    );

    gtag("event", "Landmarks_Download", {
      event_category: "Adult_Seated",
    });
  };

  this.ExportHumanDimensionsCSV = function () {
    if (!licenseManager.checkLicense()) return;

    const anthroWriter = new ASCIIAnthroWriter(anth);
    anthroWriter.saveAnthDataAsCSV(
      PCAdata,
      this.FileName + "_" + getDateNow() + "_anthro.csv"
    );

    gtag("event", "Anthro_Download", {
      event_category: "Adult_Seated",
    });
  };

  this.FitWheelchairToHuman = function () {
    showLoadingSymbol();

    setTimeout(() => {
      const optimalWheelchairParams = calculateOptimalWheelchairParams();
      updateWheelchairParams(wheelchairType, optimalWheelchairParams);
      refreshGUIWheelchairParams();

      let wheelchairUpdated = false;
      let humanUpdated = false;

      const checkWheelchairUpdated = () => {
        wheelchairUpdated = true;
      };

      const checkHumanUpdated = () => {
        humanUpdated = true;
        if (wheelchairUpdated && humanUpdated) {
          setTimeout(() => {
            hideLoadingSymbol();
          }, 500);
        }
      };

      updateWheelchairGeometry(wheelchairParams, () => {
        checkWheelchairUpdated();
      });

      if (wheelchairUpdated) {
        updateHumanGeometryFromWheelchair(
          wheelchairParams,
          wheelchairMesh,
          () => {
            checkHumanUpdated();
          }
        );
      }
    }, 100);
  };
})();

var gui = createGUIWithAnth(
  anth,
  () => {
    humanParameterChanged = true;
  },
  () => {
    wheelchairParameterChanged = true;
  }
);

function calculateOptimalSeatWidth(humanMesh) {
  const LEFT_THIGH_INDEX = 1359;
  const RIGHT_THIGH_INDEX = 3264;

  const thighWidth = calculateDistanceBetweenPoints(
    humanMesh,
    LEFT_THIGH_INDEX,
    RIGHT_THIGH_INDEX,
    true,
    false,
    false
  );

  const padding = 1;
  return mToIn(thighWidth) + padding * 2;
}

function calculateOptimalBackHeight(humanMesh) {
  const SHOULDER_INDEX = 2225;
  const shoulderWorld = getHumanModelWorldCoordinates(
    humanMesh,
    SHOULDER_INDEX
  );
  const wheelchairSeatHeight = inToM(
    wheelchairParams.seatPanHeight + wheelchairParams.seatCushThick
  );
  const backHeight = Math.abs(shoulderWorld.z - wheelchairSeatHeight);
  return mToIn(backHeight);
}

function calculateOptimalWheelchairParams() {
  let optimalParams = { ...wheelchairParams };
  optimalParams.seatWidth = calculateOptimalSeatWidth(humanMesh);
  optimalParams.seatBackHeight = calculateOptimalBackHeight(humanMesh);
  validateWheelchairParams(optimalParams);
  return optimalParams;
}

function validateWheelchairParams(params) {
  const RANGES = {
    seatWidth: { min: 14, max: 30 },
    seatBackHeight: { min: 16, max: 30 },
  };

  for (const [param, range] of Object.entries(RANGES)) {
    if (params[param] < range.min || params[param] > range.max) {
      throw new Error(`${param} out of valid range`);
    }
  }
}
