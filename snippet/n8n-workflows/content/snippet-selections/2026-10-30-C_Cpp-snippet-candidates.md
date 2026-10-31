# Snippet Candidates — 2026-10-30 — C_Cpp

Issue: #37
Date: 2026-10-30
Language: C_Cpp
Status: COMPLETED

## Repo 1 — OrcaSlicer/OrcaSlicer

### Candidate 1 (most important)

- file_path: src/libslic3r/Model.cpp
- snippet_url: https://github.com/OrcaSlicer/OrcaSlicer/blob/main/src/libslic3r/Model.cpp#L1896-L1921
- reasoning: This is the core logic that decides how far to shift a model vertically before slicing, directly determining whether a print will fail from a sunken or floating first layer.

```cpp
void ModelObject::ensure_on_bed(bool allow_negative_z)
{
    if (!auto_drop)
        return;

    double z_offset = 0.0;

    if (allow_negative_z) {
        if (parts_count() == 1) {
            const double min_z = this->min_z();
            const double max_z = this->max_z();
            if (min_z >= SINKING_Z_THRESHOLD || max_z < 0.0)
                z_offset = -min_z;
        }
        else {
            const double max_z = this->max_z();
            if (max_z < SINKING_MIN_Z_THRESHOLD)
                z_offset = SINKING_MIN_Z_THRESHOLD - max_z;
        }
    }
    else
        z_offset = -this->min_z();

    if (z_offset != 0.0)
        translate_instances(z_offset * Vec3d::UnitZ());
}
```

### Candidate 2

- file_path: src/libslic3r/Arrange.cpp
- snippet_url: https://github.com/OrcaSlicer/OrcaSlicer/blob/main/src/libslic3r/Arrange.cpp#L1280-L1298
- reasoning: This dispatcher underlies the auto-arrange feature, picking the cheapest-to-test bed geometry (infinite, circular, or arbitrary polygon) so the packing algorithm can run against the simplest shape that fits.

```cpp
template<class Fn> auto call_with_bed(const Points &bed, Fn &&fn)
{
    if (bed.empty())
        return fn(InfiniteBed{});
    else if (bed.size() == 1)
        return fn(InfiniteBed{bed.front()});
    else {
        auto      bb    = BoundingBox(bed);
        CircleBed circ  = to_circle(bb.center(), bed);
        auto      parea = poly_area(bed);

        if ((1.0 - parea / area(bb)) < 1e-3)
            return fn(bb);
        else if (!std::isnan(circ.radius()))
            return fn(circ);
        else
            return fn(Polygon(bed));
    }
}
```

### Candidate 3 (least important)

- file_path: src/libslic3r/TriangleMesh.cpp
- snippet_url: https://github.com/OrcaSlicer/OrcaSlicer/blob/main/src/libslic3r/TriangleMesh.cpp#L263-L285
- reasoning: A basic mesh transform that quietly optimizes the common uniform-scale case into a single scalar multiply per vertex instead of three, and keeps the mesh's cached volume in sync.

```cpp
void TriangleMesh::scale(const Vec3f &versor)
{
    // Scale extents.
    auto s = versor.array();
    m_stats.min.array() *= s;
    m_stats.max.array() *= s;
    // Scale size.
    m_stats.size.array() *= s;
    // Scale volume.
    if (m_stats.volume > 0.0)
        m_stats.volume *= s(0) * s(1) * s(2);
    if (versor.x() == versor.y() && versor.x() == versor.z()) {
        float s = versor.x();
        for (stl_vertex &v : this->its.vertices)
            v *= s;
    } else {
        for (stl_vertex &v : this->its.vertices) {
            v.x() *= versor.x();
            v.y() *= versor.y();
            v.z() *= versor.z();
        }
    }
}
```

## Repo 2 — obsproject/obs-studio

### Candidate 1 (most important)

- file_path: libobs/obs-scene.c
- snippet_url: https://github.com/obsproject/obs-studio/blob/master/libobs/obs-scene.c#L325-L336
- reasoning: This is the anchor-offset math OBS applies to every scene item's position on every layout recalculation — the bitmask-driven branching for the 9 alignment points (corners/edges/center) sits at the heart of how OBS composites scenes.

```c
void add_alignment(struct vec2 *v, uint32_t align, int cx, int cy)
{
	if (align & OBS_ALIGN_RIGHT)
		v->x += (float)cx;
	else if ((align & OBS_ALIGN_LEFT) == 0)
		v->x += (float)(cx / 2);

	if (align & OBS_ALIGN_BOTTOM)
		v->y += (float)cy;
	else if ((align & OBS_ALIGN_TOP) == 0)
		v->y += (float)(cy / 2);
}
```

### Candidate 2

- file_path: libobs/graphics/graphics.c
- snippet_url: https://github.com/obsproject/obs-studio/blob/master/libobs/graphics/graphics.c#L275-L293
- reasoning: This is the thread-safe, reentrant GPU-context guard that every OBS plugin touching the graphics subsystem passes through via obs_enter_graphics(); the combination of thread-local context tracking, a mutex, and a ref-count is a non-obvious concurrency pattern.

```c
void gs_enter_context(graphics_t *graphics)
{
	if (!ptr_valid(graphics, "gs_enter_context"))
		return;

	bool is_current = thread_graphics == graphics;
	if (thread_graphics && !is_current) {
		while (thread_graphics)
			gs_leave_context();
	}

	if (!is_current) {
		pthread_mutex_lock(&graphics->mutex);
		graphics->exports.device_enter_context(graphics->device);
		thread_graphics = graphics;
	}

	os_atomic_inc_long(&graphics->ref);
}
```

### Candidate 3 (least important)

- file_path: libobs/graphics/matrix4.c
- snippet_url: https://github.com/obsproject/obs-studio/blob/master/libobs/graphics/matrix4.c#L32-L51
- reasoning: A classic quaternion-to-rotation-matrix derivation used when OBS converts a source's rotation into the 4x4 transform it renders with — the normalization trick folding into a single scale factor `s` is a satisfying bit of applied math.

```c
void matrix4_from_quat(struct matrix4 *dst, const struct quat *q)
{
	float norm = quat_dot(q, q);
	float s = (norm > 0.0f) ? (2.0f / norm) : 0.0f;

	float xx = q->x * q->x * s;
	float yy = q->y * q->y * s;
	float zz = q->z * q->z * s;
	float xy = q->x * q->y * s;
	float xz = q->x * q->z * s;
	float yz = q->y * q->z * s;
	float wx = q->w * q->x * s;
	float wy = q->w * q->y * s;
	float wz = q->w * q->z * s;

	vec4_set(&dst->x, 1.0f - (yy + zz), xy + wz, xz - wy, 0.0f);
	vec4_set(&dst->y, xy - wz, 1.0f - (xx + zz), yz + wx, 0.0f);
	vec4_set(&dst->z, xz + wy, yz - wx, 1.0f - (xx + yy), 0.0f);
	vec4_set(&dst->t, 0.0f, 0.0f, 0.0f, 1.0f);
}
```
