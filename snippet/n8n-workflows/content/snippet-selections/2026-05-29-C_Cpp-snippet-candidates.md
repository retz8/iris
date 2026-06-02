# Snippet Candidates — 2026-05-29 — C_Cpp

Issue: #16
Date: 2026-05-29
Language: C_Cpp
Status: COMPLETED

## Repo 1 — alibaba/MNN

### Candidate 1 (most important)

- file_path: source/core/Schedule.cpp
- snippet_url: https://github.com/alibaba/MNN/blob/master/source/core/Schedule.cpp
- reasoning: This function implements MNN's op-graph pruning: given user-specified input/output paths, it propagates a "needed" mask backward through the op dependency graph via a fixpoint loop, selecting only the ops required to satisfy the requested outputs — the mechanism that makes partial-graph execution possible.

```cpp
static void generateScheduleGraph(
    vector<const Op*>& ops,
    const Net* net,
    const ScheduleConfig& configs,
    const vector<shared_ptr<Tensor>>& allTensors) {

    if (configs.path.inputs.empty() &&
        configs.path.outputs.empty()) {
        ops.clear();
        ops.reserve(net->oplists()->size());
        for (int i = 0; i < net->oplists()->size(); ++i) {
            auto op = net->oplists()->GetAs<Op>(i);
            ops.emplace_back(op);
        }
        return;
    }
    // 0: not set, 1: output, 2:input
    std::vector<int> tensorMask(
        net->tensorName()->size());
    ::memset(tensorMask.data(), 0,
        tensorMask.size() * sizeof(int));

    // 0: use, 1: no use
    std::vector<int> opMask(net->oplists()->size());
    ::memset(opMask.data(), 0,
        opMask.size() * sizeof(int));

    std::set<std::string> inputNames;
    std::set<std::string> outputNames;
    for (auto& n : configs.path.inputs) {
        inputNames.insert(n);
    }
    for (auto& n : configs.path.outputs) {
        outputNames.insert(n);
    }
    bool change = false;
    do {
        change = false;
        for (int i = 0; i < opMask.size(); ++i) {
            if (opMask[i] > 0) {
                continue;
            }
            auto op = net->oplists()->GetAs<Op>(i);
            if (nullptr != op->outputIndexes()) {
                for (int j = 0;
                     j < op->outputIndexes()->size();
                     ++j) {
                    auto index =
                        op->outputIndexes()->data()[j];
                    if (tensorMask[index] == 1) {
                        opMask[i] = 1;
                        change = true;
                    }
                }
            }
            if (nullptr != op->inputIndexes()
                && opMask[i]) {
                for (int j = 0;
                     j < op->inputIndexes()->size();
                     ++j) {
                    auto index =
                        op->inputIndexes()->data()[j];
                    if (tensorMask[index] != 2) {
                        tensorMask[index] = 1;
                    }
                }
            }
        }
    } while (change);

    for (int i = 0; i < opMask.size(); ++i) {
        if (opMask[i] > 0) {
            ops.emplace_back(
                net->oplists()->GetAs<Op>(i));
        }
    }
}
```

### Candidate 2

- file_path: source/core/TensorUtils.cpp
- snippet_url: https://github.com/alibaba/MNN/blob/master/source/core/TensorUtils.cpp
- reasoning: Detecting a transpose memory region requires finding exactly one axis with unit stride in both src and dst, on different axes — this compact function encodes MNN's criterion for when a raster copy can be classified as a pure transpose, enabling backend-specific transpose kernels to be dispatched instead of generic copy.

```cpp
bool TensorUtils::isTransposeRegion(
    const Tensor::InsideDescribe::Region& region) {
    int srcOne = -1, dstOne = -1;
    for (int i = 0; i < 3; i++) {
        if (region.src.stride[i] == 1
            && region.size[i] != 1) {
            if (srcOne >= 0) {
                return false;
            }
            srcOne = i;
        }
        if (region.dst.stride[i] == 1
            && region.size[i] != 1) {
            if (dstOne >= 0) {
                return false;
            }
            dstOne = i;
        }
    }
    return srcOne >= 0
        && dstOne >= 0
        && srcOne != dstOne;
}
```

### Candidate 3 (least important)

- file_path: source/core/OpCommonUtils.cpp
- snippet_url: https://github.com/alibaba/MNN/blob/master/source/core/OpCommonUtils.cpp
- reasoning: This function encodes MNN's rules for whether a strided memory region can be "fused" (blitted fast) given a particular NC4HW4 axis-swap layout, catching invalid cases where cross-axis dependencies would break the fast-blit path — called in the hot path of tensor layout conversion decisions.

```cpp
static bool _checkFuseValid(
    const OpCommonUtils::SPLITS& srcTup,
    const OpCommonUtils::SPLITS& srcSplits,
    bool swapnc,
    bool swapcw,
    const std::tuple<bool,bool,bool>& valid) {
    auto srcFused = _computeAxisFused(srcTup);
    if (swapnc) {
        if (std::get<1>(srcFused)
            && std::get<2>(valid)) {
            return false;
        }
        if (std::get<0>(srcFused)) {
            if (std::get<2>(srcTup) + 1
                != std::get<2>(srcSplits)) {
                return false;
            }
        }
    } else if (swapcw) {
        if (std::get<0>(srcFused)
            && std::get<0>(valid)) {
            return false;
        }
        if (std::get<1>(srcFused)) {
            if (std::get<1>(srcTup) + 1
                != std::get<1>(srcSplits)) {
                return false;
            }
        }
    } else {
        if (std::get<2>(srcFused)
            && std::get<1>(valid)) {
            return false;
        }
        if (std::get<0>(srcFused)
            && std::get<0>(valid)) {
            return false;
        }
        if (std::get<1>(srcFused)
            && std::get<2>(valid)) {
            return false;
        }
    }
    return true;
}
```

## Repo 2 — opentoonz/opentoonz

### Candidate 1 (most important)

- file_path: toonz/sources/toonzlib/tcenterlineskeletonizer.cpp
- snippet_url: https://github.com/opentoonz/opentoonz/blob/master/toonz/sources/toonzlib/tcenterlineskeletonizer.cpp
- reasoning: This is the straight-skeleton algorithm that drives OpenToonz's centerline vectorization — it converts scanned hand-drawn lines into editable vector strokes, which is the software's signature feature for production animation.

```cpp
inline void Event::calculateEdgeEvent() {
  struct locals {
    static inline void buildDisplacements(
        ContourNode *edgeFirst,
        double &d1, double &d2) {
      ContourNode *edgeSecond = edgeFirst->m_next;

      if ((edgeFirst->m_concave &&
           edgeSecond->m_concave) ||
          edgeFirst->m_direction *
              edgeSecond->m_direction < -0.9) {
        d1 = d2 = -1.0;
        return;
      }

      double det =
          edgeFirst->m_direction.y *
              edgeSecond->m_direction.x -
          edgeFirst->m_direction.x *
              edgeSecond->m_direction.y;

      double cx = edgeSecond->m_position.x -
                      edgeFirst->m_position.x,
             cy = edgeSecond->m_position.y -
                      edgeFirst->m_position.y;

      d1 = (edgeSecond->m_direction.x * cy -
            edgeSecond->m_direction.y * cx) / det;
      d2 = (edgeFirst->m_direction.x * cy -
            edgeFirst->m_direction.y * cx) / det;
    }

    static inline double height(
        ContourNode *node, double displacement) {
      return node->m_position.z +
             displacement * node->m_direction.z;
    }
  };

  double minHeight, minDisplacement;
  bool positiveEdgeDispl;
  m_type = edge;

  double firstDisplacement, prevDisplacement,
         nextDisplacement, lastDisplacement;

  locals::buildDisplacements(
      m_generator, nextDisplacement, lastDisplacement);
  locals::buildDisplacements(
      m_generator->m_prev,
      firstDisplacement, prevDisplacement);

  static const double minusTol = -0.03;
  bool prevDispPositive = (prevDisplacement > minusTol);
  bool nextDispPositive = (nextDisplacement > minusTol);

  if (nextDispPositive) {
    if (!prevDispPositive ||
        nextDisplacement < prevDisplacement) {
      m_coGenerator     = m_generator;
      minDisplacement   = nextDisplacement;
      minHeight = locals::height(
          m_coGenerator, nextDisplacement);
      positiveEdgeDispl =
          (nextDispPositive &&
           lastDisplacement > minusTol);
    } else {
      m_coGenerator   = m_generator->m_prev;
      minDisplacement = prevDisplacement;
      minHeight = locals::height(
          m_coGenerator, firstDisplacement);
      positiveEdgeDispl =
          (prevDispPositive &&
           firstDisplacement > minusTol);
    }
  } else if (prevDispPositive) {
    m_coGenerator   = m_generator->m_prev;
    minDisplacement = prevDisplacement;
    minHeight = locals::height(
        m_coGenerator, firstDisplacement);
    positiveEdgeDispl =
        (prevDispPositive &&
         firstDisplacement > minusTol);
  } else {
    m_type = failure;
    return;
  }

  if (positiveEdgeDispl ||
      minHeight > m_context->m_currentHeight - 0.01)
    m_height = minHeight,
    m_displacement = minDisplacement;
  else
    m_type = failure;
}
```

### Candidate 2

- file_path: toonz/sources/toonzlib/ikjacobian.cpp
- snippet_url: https://github.com/opentoonz/opentoonz/blob/master/toonz/sources/toonzlib/ikjacobian.cpp
- reasoning: Implements the full Singular Value Decomposition entry point for the IK Jacobian solver, orchestrating bidiagonalization and Golub-Reinsch iterative convergence — the mathematical core of the skeletal inverse-kinematics rig system.

```cpp
// Returns orthogonal U, V and diagonal w such that:
//   (this) = U * Diag(w) * V^T
void MatrixRmn::ComputeSVD(
    MatrixRmn &U, VectorRn &w, MatrixRmn &V) const {
  assert(U.NumRows == NumRows &&
         V.NumCols == NumCols &&
         U.NumRows == U.NumCols &&
         V.NumRows == V.NumCols &&
         w.GetLength() ==
             std::min(NumRows, NumCols));

  VectorRn &superDiag =
      VectorRn::GetWorkVector(w.GetLength() - 1);

  // If U is larger than V, copy A into U and compute
  // SVD of A. Otherwise copy A-transpose into V and
  // compute SVD of A^T (essentially the same result).
  MatrixRmn *leftMatrix;
  MatrixRmn *rightMatrix;
  if (NumRows >= NumCols) {
    U.LoadAsSubmatrix(*this);
    leftMatrix  = &U;
    rightMatrix = &V;
  } else {
    V.LoadAsSubmatrixTranspose(*this);
    leftMatrix  = &V;
    rightMatrix = &U;
  }

  // Reduce to bidiagonal form via Householder xforms,
  // then iterate Givens rotations (Golub-Reinsch) to
  // drive superdiagonal entries to zero.
  CalcBidiagonal(
      *leftMatrix, *rightMatrix, w, superDiag);
  ConvertBidiagToDiagonal(
      *leftMatrix, *rightMatrix, w, superDiag);
}
```

### Candidate 3 (least important)

- file_path: toonz/sources/toonzlib/ikengine.cpp
- snippet_url: https://github.com/opentoonz/opentoonz/blob/master/toonz/sources/toonzlib/ikengine.cpp
- reasoning: Shows how the IK solver ties together effector setup, Jacobian construction, and the DLS/pseudoinverse method-dispatch loop that runs 250 iterations per drag event — a readable window into the full IK pipeline.

```cpp
void IKEngine::drag(TPointD &pos) {
  if (m_skeleton.getNodeCount() == 0) return;
  int indexDrag = m_skeleton.getNodeCount() - 1;
  if (m_skeleton.getNode(indexDrag)
          ->getParent()->IsEffector()) return;
  m_skeleton.setPurpose(indexDrag, IKNode::EFFECTOR);
  setSequenceJoints();
  target.push_back(pos);
  Jacobian jacobian(&m_skeleton, target);
  target.pop_back();
  for (int i = 0; i < 250; i++)
    doUpdateStep(jacobian);
}

void IKEngine::doUpdateStep(Jacobian &jacobian) {
  jacobian.computeJacobian();
  int WhichMethod = DLS;
  bool clampingDetected = true;
  while (clampingDetected) {
    switch (WhichMethod) {
    case JACOB_TRANS:
      jacobian.CalcDeltaThetasTranspose();
      break;
    case DLS:
      jacobian.CalcDeltaThetasDLS();
      break;
    case PURE_PSEUDO:
      jacobian.CalcDeltaThetasPseudoinverse();
      break;
    case SDLS:
      jacobian.CalcDeltaThetasSDLS();
      break;
    default:
      jacobian.ZeroDeltaThetas();
      break;
    }
    jacobian.UpdateThetas();
    clampingDetected = jacobian.checkJointsLimit();
  }
}
```
