# Breakdown Review — 2026-04-03 — C/C++

Issue: #8
Date: 2026-04-03
Language: C/C++
Status: PENDING_APPROVAL

## Repo 1 — MrNeRF/LichtFeld-Studio

- file_path: src/core/splat_simplify.cpp
- snippet_url: https://github.com/MrNeRF/LichtFeld-Studio/blob/master/src/core/splat_simplify.cpp

file_intent: Symmetric 3x3 eigendecomposition solver
breakdown_what: Iteratively diagonalizes a 3x3 symmetric matrix by locating the largest off-diagonal element each sweep, computing a numerically stable Givens rotation angle, applying the rotation to zero that element, and accumulating rotations into an eigenvector matrix.
breakdown_responsibility: Decomposes each Gaussian splat's 3x3 covariance matrix into eigenvalues and eigenvectors during scene simplification — the eigenvalues encode the splat's scale along each axis, which the simplifier uses to decide which splats can be merged or removed.
breakdown_clever: The Givens angle uses `copysign(1, tau) / (|tau| + sqrt(1 + tau^2))` instead of the textbook `atan2` formula — this avoids catastrophic cancellation when two diagonal entries are nearly equal, which is the common case for near-spherical Gaussian splats.
project_context: A native desktop application for training, inspecting, editing, and exporting 3D Gaussian Splatting scenes — used by researchers and 3D artists to reconstruct photorealistic 3D environments from photograph collections using modern GPU-accelerated splatting techniques.

### Reformatted Snippet

```cpp
[[nodiscard]] Eigen3x3
eigen_symmetric_3x3_jacobi(
    const std::array<float, 9>& Ain) {

    std::array<float, 9> A = Ain;
    std::array<float, 9> V = {
        1.0f, 0.0f, 0.0f,
        0.0f, 1.0f, 0.0f,
        0.0f, 0.0f, 1.0f,
    };

    for (int iter = 0;
         iter < kJacobiIterations;
         ++iter) {
        // find largest off-diagonal entry
        int p = 0, q = 1;
        float max_abs = std::abs(A[1]);
        if (std::abs(A[2]) > max_abs) {
            p = 0; q = 2;
            max_abs = std::abs(A[2]);
        }
        if (std::abs(A[5]) > max_abs) {
            p = 1; q = 2;
            max_abs = std::abs(A[5]);
        }
        if (max_abs < 1e-12f)
            break;

        const int pp = 3 * p + p;
        const int qq = 3 * q + q;
        const int pq = 3 * p + q;
        const float app = A[pp];
        const float aqq = A[qq];
        const float apq = A[pq];

        // numerically stable Givens angle
        const float tau =
            (aqq - app) / (2.0f * apq);
        const float t =
            std::copysign(1.0f, tau)
            / (std::abs(tau)
               + std::sqrt(
                   1.0f + tau * tau));
        const float c =
            1.0f
            / std::sqrt(1.0f + t * t);
        const float s = t * c;

        // update off-diagonal rows
        for (int k = 0; k < 3; ++k) {
            if (k == p || k == q)
                continue;
            const float akp =
                A[3*k + p];
            const float akq =
                A[3*k + q];
            A[3*k + p] =
                c*akp - s*akq;
            A[3*p + k] = A[3*k + p];
            A[3*k + q] =
                s*akp + c*akq;
            A[3*q + k] = A[3*k + q];
        }

        // update diagonal entries
        A[pp] = c*c*app
            - 2.0f*s*c*apq
            + s*s*aqq;
        A[qq] = s*s*app
            + 2.0f*s*c*apq
            + c*c*aqq;
        A[pq] = 0.0f;
        A[3*q + p] = 0.0f;

        // accumulate rotation in V
        for (int k = 0; k < 3; ++k) {
            const float vkp =
                V[3*k + p];
            const float vkq =
                V[3*k + q];
            V[3*k + p] =
                c*vkp - s*vkq;
            V[3*k + q] =
                s*vkp + c*vkq;
        }
    }

    Eigen3x3 out;
    out.values  = {A[0], A[4], A[8]};
    out.vectors = V;
    return sort_eigendecomposition(out);
}
```

## Repo 2 — FreeCAD/FreeCAD

- file_path: src/Base/Matrix.cpp
- snippet_url: https://github.com/FreeCAD/FreeCAD/blob/main/src/Base/Matrix.cpp

file_intent: Transformation matrix scale classifier
breakdown_what: Classifies a 4D transformation matrix's scaling type by comparing column and row vector magnitudes against the 3x3 determinant, distinguishing uniform scaling, left-applied non-uniform, right-applied non-uniform, projection/shear, or no scaling at all.
breakdown_responsibility: Gates FreeCAD's geometry pipeline so downstream operations like Boolean cuts and fillet computations can choose the correct algorithm path — uniform scaling allows fast shortcuts, while non-uniform or shear scaling requires expensive general-case handling.
breakdown_clever: Left vs. right non-uniform scaling is detected by checking whether row vectors or column vectors match the determinant — because `M = R * S` distorts columns while `M = S * R` distorts rows, so comparing `sqrt(dx*dy*dz)` against `sqrt(du*dv*dw)` reveals which side the scale was applied from.
project_context: The leading open-source parametric 3D CAD modeler used by mechanical engineers, architects, and hobbyists as a free alternative to SolidWorks and Fusion 360 — supports part design, assembly, FEM simulation, and BIM across all major operating systems.

### Reformatted Snippet

```cpp
ScaleType Matrix4D::hasScale(
    double tol) const
{
    const double defaultTolerance =
        1e-9;
    // check for uniform scaling
    //
    // For a scaled rotation matrix it
    // matters whether the scaling was
    // applied from the left or right
    // side. Only in case of uniform
    // scaling it doesn't matter.
    if (tol == 0.0) {
        tol = defaultTolerance;
    }

    // check if absolute values are
    // proportionally close
    auto closeAbs =
        [&](double val_a, double val_b)
    {
        double abs_a = fabs(val_a);
        double abs_b = fabs(val_b);
        if (abs_b > abs_a) {
            return (abs_b - abs_a)
                / abs_b <= tol;
        }
        if (abs_a > abs_b) {
            return (abs_a - abs_b)
                / abs_a <= tol;
        }
        return true;
    };

    // get column vectors
    double dx = getCol(0).Sqr();
    double dy = getCol(1).Sqr();
    double dz = getCol(2).Sqr();
    double dxyz =
        sqrt(dx * dy * dz);

    // get row vectors
    double du = getRow(0).Sqr();
    double dv = getRow(1).Sqr();
    double dw = getRow(2).Sqr();
    double duvw =
        sqrt(du * dv * dw);

    double d3 = determinant3();

    // This could be e.g. a projection,
    // shearing, etc.
    if (!closeAbs(dxyz, d3)
        && !closeAbs(duvw, d3)) {
        return ScaleType::Other;
    }

    if (closeAbs(duvw, d3)
        && (!closeAbs(du, dv)
            || !closeAbs(dv, dw))) {
        return
            ScaleType::NonUniformLeft;
    }

    if (closeAbs(dxyz, d3)
        && (!closeAbs(dx, dy)
            || !closeAbs(dy, dz))) {
        return
            ScaleType::NonUniformRight;
    }

    if (fabs(d3 - 1.0) > tol) {
        return ScaleType::Uniform;
    }

    return ScaleType::NoScaling;
}
```
