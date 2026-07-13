# Breakdown Review — 2026-07-10 — C/C++

Issue: #22
Date: 2026-07-10
Language: C/C++
Status: COMPLETED

## Repo 1 — jrouwe/JoltPhysics

- file_path: Jolt/Physics/IslandBuilder.cpp
- snippet_url: https://github.com/jrouwe/JoltPhysics/blob/master/Jolt/Physics/IslandBuilder.cpp

file_intent: Lock-free physics island union-find
breakdown_what: Merges two physics bodies into the same simulation island by performing a concurrent union-find path compression using atomic compare-and-swap operations, always linking the higher body index to the lower one.
breakdown_responsibility: Groups bodies that directly or indirectly touch each other into islands so the solver can skip pairs that cannot affect each other and process each island independently — the foundation of JoltPhysics's performance on multi-core hardware.
breakdown_clever: Always linking the higher-indexed body to the lower one via CAS creates a total ordering that prevents deadlock when two threads simultaneously try to union the same pair — without this invariant, each thread could block waiting for the other's CAS.
project_context: JoltPhysics is a multi-core rigid body physics engine used in production by Horizon Forbidden West and Death Stranding 2, designed for large open-world games where physics must run safely across many CPU threads simultaneously.

### Reformatted Snippet

```cpp
void IslandBuilder::LinkBodies(
    uint32 inFirst, uint32 inSecond)
{
  if (inFirst >= mMaxActiveBodies
   || inSecond >= mMaxActiveBodies)
    return;

  uint32 first_link_to  = inFirst;
  uint32 second_link_to = inSecond;

  for (;;)
  {
    first_link_to  =
      GetLowestBodyIndex(first_link_to);
    second_link_to =
      GetLowestBodyIndex(second_link_to);

    if (first_link_to == second_link_to)
      break;

    if (first_link_to < second_link_to)
    {
      if (!mBodyLinks[second_link_to].mLinkedTo
           .compare_exchange_weak(
               second_link_to, first_link_to,
               memory_order_relaxed))
        continue;
    }
    else
    {
      if (!mBodyLinks[first_link_to].mLinkedTo
           .compare_exchange_weak(
               first_link_to, second_link_to,
               memory_order_relaxed))
        continue;
    }

    uint32 lowest =
      min(first_link_to, second_link_to);
    AtomicMin(mBodyLinks[inFirst].mLinkedTo,
              lowest, memory_order_relaxed);
    AtomicMin(mBodyLinks[inSecond].mLinkedTo,
              lowest, memory_order_relaxed);
    break;
  }
}
```

## Repo 2 — barry-ran/QtScrcpy

- file_path: QtScrcpyCore/src/device/demuxer/demuxer.cpp
- snippet_url: https://github.com/barry-ran/QtScrcpyCore/blob/main/src/device/demuxer/demuxer.cpp

file_intent: Android video packet deserializer
breakdown_what: Reads a 12-byte binary header from the Android stream, allocates an FFmpeg AVPacket of the declared size, fills it with raw video data, then decodes the high two bits of the PTS field to set config and keyframe metadata.
breakdown_responsibility: Bridges the scrcpy binary wire protocol and FFmpeg's packet model — every video frame from the connected Android device passes through here before it can be decoded and rendered on the desktop.
breakdown_clever: `SC_PACKET_PTS_MASK` is derived as `KEY_FRAME_FLAG - 1` rather than a literal bitmask, so if the top two flag bits ever shift to different positions, the timestamp extraction formula adjusts automatically without a separate constant to update.
project_context: QtScrcpy is a Qt-based Android screen mirroring and control tool that lets you display and control any Android device from a desktop over USB or WiFi, with sub-30ms latency at 1080p and no root required.

### Reformatted Snippet

```cpp
#define HEADER_SIZE 12

#define SC_PACKET_FLAG_CONFIG    (UINT64_C(1) << 63)
#define SC_PACKET_FLAG_KEY_FRAME (UINT64_C(1) << 62)

#define SC_PACKET_PTS_MASK \
    (SC_PACKET_FLAG_KEY_FRAME - 1)

bool Demuxer::recvPacket(AVPacket *packet)
{
    quint8 header[HEADER_SIZE];
    qint32 r = recvData(header, HEADER_SIZE);
    if (r < HEADER_SIZE) {
        return false;
    }

    quint64 ptsFlags = bufferRead64be(header);
    quint32 len = bufferRead32be(&header[8]);
    Q_ASSERT(len);

    if (av_new_packet(packet, static_cast<int>(len))) {
        qCritical("Could not allocate packet");
        return false;
    }

    r = recvData(
        packet->data,
        static_cast<qint32>(len));
    if (r < 0 ||
        static_cast<quint32>(r) < len) {
        av_packet_unref(packet);
        return false;
    }

    if (ptsFlags & SC_PACKET_FLAG_CONFIG) {
        packet->pts = AV_NOPTS_VALUE;
    } else {
        packet->pts =
            ptsFlags & SC_PACKET_PTS_MASK;
    }

    if (ptsFlags & SC_PACKET_FLAG_KEY_FRAME) {
        packet->flags |= AV_PKT_FLAG_KEY;
    }

    packet->dts = packet->pts;
    return true;
}
```
