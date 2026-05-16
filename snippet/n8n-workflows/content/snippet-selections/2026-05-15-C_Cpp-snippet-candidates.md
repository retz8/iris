# Snippet Candidates — 2026-05-15 — C_Cpp

Issue: #14
Date: 2026-05-15
Language: C_Cpp
Status: PENDING_SELECTION

## Repo 1 — deskflow/deskflow

### Candidate 1 (most important)

- file_path: src/lib/deskflow/KeyMap.cpp
- snippet_url: https://github.com/deskflow/deskflow/blob/master/src/lib/deskflow/KeyMap.cpp
- reasoning: This is the keyboard layout resolution engine — it picks which physical key and modifier combination to synthesize for any desired key ID, using a two-phase best-match algorithm that first seeks an exact modifier state match and falls back to the fewest-modifier-changes heuristic, which is the core of cross-platform keyboard sharing correctness.

```cpp
int32_t KeyMap::findBestKey(
    const KeyEntryList &entryList,
    KeyModifierMask desiredState
) const
{
  // check for an item that can accommodate
  // the desiredState exactly
  for (int32_t i = 0;
       i < (int32_t)entryList.size(); ++i) {
    const KeyItem &item = entryList[i].back();
    if ((item.m_required & desiredState)
            == item.m_required &&
        (item.m_required & desiredState)
            == (item.m_sensitive & desiredState)) {
      return i;
    }
  }

  // choose the item that requires the fewest
  // modifier changes
  int32_t bestCount = 32;
  int32_t bestIndex = -1;
  for (int32_t i = 0;
       i < (int32_t)entryList.size(); ++i) {
    const KeyItem &item = entryList[i].back();
    KeyModifierMask change =
        ((item.m_required ^ desiredState)
         & item.m_sensitive);
    int32_t n = getNumModifiers(change);
    if (n < bestCount) {
      bestCount = n;
      bestIndex = i;
    }
  }

  return bestIndex;
}
```

### Candidate 2

- file_path: src/lib/server/Server.cpp
- snippet_url: https://github.com/deskflow/deskflow/blob/master/src/lib/server/Server.cpp
- reasoning: `isSwitchOkay` is the central policy gate for every screen transition — it enforces two-tap delay, dwell-time wait, locked-corner zones, scroll-lock capture, and modifier key requirements before allowing the cursor to cross to another machine, making it the condensed expression of Deskflow's most user-visible UX decisions.

```cpp
bool Server::isSwitchOkay(
    BaseClientProxy *newScreen,
    Direction dir,
    int32_t x, int32_t y,
    int32_t xActive, int32_t yActive
)
{
  if (newScreen == nullptr) {
    stopSwitch();
    return false;
  }

  bool preventSwitch = false;
  bool allowSwitch   = false;

  bool isNewDirection = (dir != m_switchDir);
  if (isNewDirection || m_switchScreen == nullptr) {
    m_switchDir    = dir;
    m_switchScreen = newScreen;
  }

  // double-tap guard
  if (!allowSwitch && m_switchTwoTapDelay > 0.0) {
    if (isNewDirection
        || !isSwitchTwoTapStarted()
        || !shouldSwitchTwoTap()) {
      preventSwitch = true;
      startSwitchTwoTap();
    } else {
      allowSwitch = true;
    }
  }

  // dwell-time guard
  if (!allowSwitch && m_switchWaitDelay > 0.0) {
    if (isNewDirection || !isSwitchWaitStarted()) {
      startSwitchWait(x, y);
    }
    preventSwitch = true;
  }

  // locked-corner guard
  const Config::ScreenOptions *options =
      m_config->getOptions(getName(m_active));
  if (options == nullptr
      || !options->contains(
             kOptionScreenSwitchCorners)) {
    options = m_config->getOptions("");
  }
  if (options != nullptr
      && options->contains(
             kOptionScreenSwitchCorners)) {
    auto i = options->find(
        kOptionScreenSwitchCorners);
    auto corners =
        static_cast<uint32_t>(i->second);
    i = options->find(
        kOptionScreenSwitchCornerSize);
    int32_t size = 0;
    if (i != options->end()) {
      size = i->second;
    }
    if ((getCorner(m_active,
                   xActive, yActive, size)
         & corners) != 0) {
      preventSwitch = true;
      stopSwitch();
    }
  }

  // screen-lock guard
  if (!preventSwitch && isLockedToScreen()) {
    preventSwitch = true;
    stopSwitch();
  }

  // required-modifier guard
  KeyModifierMask mods =
      m_primaryClient->getToggleMask();
  if (!preventSwitch
      && ((m_switchNeedsShift
           && !(mods & KeyModifierShift))
          || (m_switchNeedsControl
              && !(mods & KeyModifierControl))
          || (m_switchNeedsAlt
              && !(mods & KeyModifierAlt)))) {
    preventSwitch = true;
    stopSwitch();
  }

  return !preventSwitch;
}
```

### Candidate 3 (least important)

- file_path: src/lib/server/InputFilter.cpp
- snippet_url: https://github.com/deskflow/deskflow/blob/master/src/lib/server/InputFilter.cpp
- reasoning: `Rule::handleEvent` reveals the condition/action dispatch architecture of Deskflow's input filter — a pattern where each rule tests a single `Condition` against an incoming event and, on match, fans out to a list of `Action` objects, making it worth studying to understand how hotkeys, screen-switch triggers, and keyboard broadcasts are all unified under one extensible rule model.

```cpp
bool InputFilter::Rule::handleEvent(
    const Event &event
)
{
  // nullptr condition never matches
  if (m_condition == nullptr) {
    return false;
  }

  const ActionList *actions;
  switch (m_condition->match(event)) {
    using enum FilterStatus;
  default:
    return false;

  case Activate:
    actions = &m_activateActions;
    LOG_VERBOSE("activate actions");
    break;

  case Deactivate:
    actions = &m_deactivateActions;
    LOG_VERBOSE("deactivate actions");
    break;
  }

  for (auto action : *actions) {
    LOG_VERBOSE(
        "hotkey: %s",
        action->format().c_str()
    );
    action->perform(event);
  }

  return true;
}
```

## Repo 2 — microsoft/WSL

### Candidate 1 (most important)

- file_path: src/linux/plan9/p9scheduler.cpp
- snippet_url: https://github.com/microsoft/WSL/blob/master/src/linux/plan9/p9scheduler.cpp
- reasoning: This is the cooperative coroutine scheduler driving WSL's Plan 9 (virtio-fs/9P) file system — it implements a work-stealing design where a thread that is about to block hands off queue ownership to a new worker thread, making the blocking pattern completely transparent to callers.

```cpp
/// Runs coroutines until there are no more in the queue
/// or until this thread gave up the queue in order to
/// run blocking code.
///
/// Must be called on the thread that called Claim().
void Scheduler::RunAndRelease() noexcept
{
    WI_ASSERT(!tls_Blocked);

    tls_SchedulerThread = true;
    std::unique_lock<std::shared_mutex> lock(m_Lock);
    while (!m_Queue.empty())
    {
        auto coroutine = m_Queue.front();
        m_Queue.pop();
        lock.unlock();
        coroutine.resume();
        if (tls_Blocked)
        {
            tls_Blocked = false;
            tls_SchedulerThread = false;
            return;
        }

        lock.lock();
    }

    WI_ASSERT(
        m_Queue.empty() || m_Running || m_ThreadEnqueued);

    m_Running = false;
    tls_SchedulerThread = false;
}

/// Called when the current thread may block for some
/// time. Gives up queue ownership, potentially
/// scheduling another thread to resume running
/// non-blocking code.
bool Scheduler::Block() noexcept
{
    if (!tls_SchedulerThread)
    {
        return false;
    }

    WI_ASSERT(!tls_Blocked);

    tls_Blocked = true;

    bool kick = false;

    {
        std::unique_lock<std::shared_mutex> lock(m_Lock);

        WI_ASSERT(m_Running);

        m_Running = false;
        if (!m_Queue.empty() && !m_ThreadEnqueued)
        {
            m_ThreadEnqueued = true;
            kick = true;
        }
    }

    if (kick)
    {
        m_Work->Submit();
    }

    return true;
}
```

### Candidate 2

- file_path: src/linux/plan9/p9fs.cpp
- snippet_url: https://github.com/microsoft/WSL/blob/master/src/linux/plan9/p9fs.cpp
- reasoning: `MakeRoot` is the entry point for every 9P client connection and encodes the security contract for WSL's cross-OS filesystem sharing — it resolves whether to impersonate the requesting UID, requires root for identity switching, and falls back to the "nobody" group when `/etc/passwd` has no entry for the user.

```cpp
Expected<std::shared_ptr<const IRoot>>
ShareList::MakeRoot(
    std::string_view aname, LX_UID_T uid)
{
    auto share = Get(aname);
    if (!share)
    {
        return LxError{LX_ENOENT};
    }

    gid_t gid;
    uid_t currentUid = geteuid();
    if (uid == currentUid)
    {
        // No need to change IDs if the requested user
        // matches the user the server is running as.
        uid = util::c_InvalidUid;
        gid = util::c_InvalidGid;
    }
    else if (currentUid == 0)
    {
        gid = util::GetUserGroupId(uid);
        if (gid == util::c_InvalidGid)
        {
            // The user wasn't found in /etc/passwd,
            // so use "nobody" as the group.
            gid = util::GetGroupIdByName(
                c_NobodyGroupName);
            if (gid == util::c_InvalidGid)
            {
                // No group named nobody, so fail.
                return LxError{LX_EINVAL};
            }
        }
    }
    else
    {
        // The server is not running as root.
        // N.B. It's possible to make this work as
        //      long as the server has CAP_SETUID,
        //      but that is currently not needed.
        return LxError{LX_EPERM};
    }

    std::shared_ptr<const IRoot> root =
        std::make_shared<const Root>(
            share, share->RootFd.get(), uid, gid);
    return root;
}
```

### Candidate 3 (least important)

- file_path: src/linux/plan9/p9handler.cpp
- snippet_url: https://github.com/microsoft/WSL/blob/master/src/linux/plan9/p9handler.cpp
- reasoning: The `RequestTracker` destructor implements a non-obvious manual ownership transfer: when a `Tflush` cancels an in-flight request, it takes ownership of the `RequestInfo` allocation by having the destructor `release()` the `unique_ptr`, then signals the waiting Tflush thread — avoiding a use-after-free without requiring a shared_ptr on the hot path.

```cpp
~RequestTracker()
{
    // The pointers can be invalid if this instance
    // has been moved.
    if (!m_requestList || !m_request)
    {
        return;
    }

    {
        std::lock_guard<std::mutex> lock{
            m_requestList->Lock};

        // Remove the request from the list of
        // pending requests. This means Cancelled
        // can't change after the lock is dropped,
        // since HandleFlush can't find the request
        // anymore.
        m_requestList->Requests.Remove(*m_request);
    }

    // If the request is marked Cancelled, a Tflush
    // has taken ownership of this pointer and is
    // waiting for the event. The pointer may become
    // invalid as soon as the event is set.
    // N.B. A shared_ptr would be nicer, but Tflush
    //      can only get the RequestInfo itself from
    //      the linked list, so it wouldn't be able
    //      to access the shared_ptr's reference
    //      count. Therefore, this ownership
    //      shuffling is required.
    auto& localRequest = *m_request;
    if (m_request->Cancelled)
    {
        m_request.release();
    }

    localRequest.Event.Set();
}
```
