# Breakdown Review — 2026-10-30 — C/C++

Issue: #37
Date: 2026-10-30
Language: C/C++
Status: PENDING_APPROVAL

## Repo 1 — OrcaSlicer/OrcaSlicer

- file_path: src/libslic3r/Model.cpp
- snippet_url: https://github.com/OrcaSlicer/OrcaSlicer/blob/main/src/libslic3r/Model.cpp#L1896-L1921

file_intent: Model auto-drop Z-offset logic
breakdown_what: Computes the vertical offset needed to rest a model object on the print bed, branching on whether negative Z is allowed and whether the object has one part or several, then translates all instances by that offset.
breakdown_responsibility: Runs automatically whenever a model is loaded or transformed in OrcaSlicer, ensuring every printable object sits correctly on the bed before slicing; this prevents floating or sunken geometry from producing invalid G-code or failed prints.
breakdown_clever: The multi-part branch only lifts the object when the whole assembly's max Z is below a threshold, meaning if even one part sticks up high enough, no part gets auto-lowered, silently leaving other parts sunk below the bed plane.
project_context: OrcaSlicer is a free, open-source slicer that converts 3D models into G-code for FDM/FFF printers from brands like Bambu Lab, Prusa, Voron, and Creality, and is known for its advanced calibration tools.

### Reformatted Snippet

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
            if (min_z >= SINKING_Z_THRESHOLD ||
                max_z < 0.0)
                z_offset = -min_z;
        }
        else {
            const double max_z = this->max_z();
            if (max_z < SINKING_MIN_Z_THRESHOLD)
                z_offset = SINKING_MIN_Z_THRESHOLD -
                    max_z;
        }
    }
    else
        z_offset = -this->min_z();

    if (z_offset != 0.0)
        translate_instances(
            z_offset * Vec3d::UnitZ());
}
```

## Repo 2 — obsproject/obs-studio

- file_path: libobs/graphics/graphics.c
- snippet_url: https://github.com/obsproject/obs-studio/blob/master/libobs/graphics/graphics.c#L275-L293

file_intent: Graphics thread context entry guard
breakdown_what: Acquires the active graphics context for the calling thread, waiting for any other thread holding it to fully release it first, then locks a mutex, enters the device context, and increments a reference counter.
breakdown_responsibility: Guards every call into OBS's graphics subsystem, since only one thread may hold the active rendering context at a time; this function is the entry half of a push-style stack that gs_leave_context balances, protecting shared GPU state.
breakdown_clever: The while-loop spins calling gs_leave_context repeatedly rather than blocking, meaning a thread switching context must fully unwind every nested entry held by the previous thread before this one proceeds, while same-thread reentry skips locking entirely via is_current.
project_context: OBS Studio is free, open-source software used by streamers and content creators to capture gameplay, webcam, and screen video and broadcast or record it, with a large plugin ecosystem supporting native C/C++ and scripted extensions.

### Reformatted Snippet

```c
void gs_enter_context(graphics_t *graphics)
{
	if (!ptr_valid(graphics, "gs_enter_context"))
		return;

	bool is_current =
		thread_graphics == graphics;
	if (thread_graphics && !is_current) {
		while (thread_graphics)
			gs_leave_context();
	}

	if (!is_current) {
		pthread_mutex_lock(&graphics->mutex);
		graphics->exports.device_enter_context(
			graphics->device);
		thread_graphics = graphics;
	}

	os_atomic_inc_long(&graphics->ref);
}
```
