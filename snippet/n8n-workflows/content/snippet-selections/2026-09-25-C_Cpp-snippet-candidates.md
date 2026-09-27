# Snippet Candidates — 2026-09-25 — C_Cpp

Issue: #32
Date: 2026-09-25
Language: C_Cpp
Status: PENDING_SELECTION

## Repo 1 — keepassxreboot/keepassxc

### Candidate 1 (most important)

- file_path: src/crypto/kdf/Argon2Kdf.cpp
- snippet_url: https://github.com/keepassxreboot/keepassxc/blob/develop/src/crypto/kdf/Argon2Kdf.cpp#L69-L78
- reasoning: This bounds check guards the memory-cost parameter of Argon2, the key derivation function that determines how expensive it is to brute-force a KeePassXC master password, making it the security-critical gatekeeper for the whole database's crack-resistance.

```cpp
bool Argon2Kdf::setMemory(quint64 kibibytes)
{
    // MIN=8KB; MAX=2,147,483,648KB
    if (kibibytes >= 8 && kibibytes < (1ULL << 32)) {
        m_memory = kibibytes;
        return true;
    }
    m_memory = ARGON2_DEFAULT_MEMORY;
    return false;
}
```

### Candidate 2

- file_path: src/core/PassphraseGenerator.cpp
- snippet_url: https://github.com/keepassxreboot/keepassxc/blob/develop/src/core/PassphraseGenerator.cpp#L41-L51
- reasoning: This is the information-theoretic entropy formula (log2 of wordlist size times word count) that backs KeePassXC's diceware-style passphrase generator, a core feature for generating memorable-yet-strong passwords.

```cpp
double PassphraseGenerator::estimateEntropy(int wordCount)
{
    if (m_wordlist.isEmpty()) {
        return 0.0;
    }
    if (wordCount < 1) {
        wordCount = m_wordCount;
    }

    return std::log2(m_wordlist.size()) * wordCount;
}
```

### Candidate 3 (least important)

- file_path: src/core/Group.cpp
- snippet_url: https://github.com/keepassxreboot/keepassxc/blob/develop/src/core/Group.cpp#L531-L555
- reasoning: This walks a Group's ancestor chain to build a breadcrumb path capped at a given depth, a small but non-obvious tree-traversal utility used by search, health-check reporting, and browser integration to display where an entry lives.

```cpp
QStringList Group::hierarchy(int height) const
{
    QStringList hierarchy;
    const Group* group = this;
    const Group* parent = m_parent;

    if (height == 0) {
        return hierarchy;
    }

    hierarchy.prepend(group->name());

    int level = 1;
    bool heightReached = level == height;

    while (parent && !heightReached) {
        group = group->parentGroup();
        parent = group->parentGroup();
        heightReached = ++level == height;

        hierarchy.prepend(group->name());
    }

    return hierarchy;
}
```

## Repo 2 — opencv/opencv

### Candidate 1 (most important)

- file_path: modules/imgproc/src/canny.cpp
- snippet_url: https://github.com/opencv/opencv/blob/5.x/modules/imgproc/src/canny.cpp#L757-L770
- reasoning: This is the iterative hysteresis-thresholding sweep at the heart of OpenCV's Canny edge detector, one of the most widely used functions in computer vision, showing how it grows edges from strong pixels through connected weak ones using an explicit stack instead of recursion.

```cpp
#define CANNY_PUSH(map, stack) *map = 2, stack.push_back(map)

    while (!stack.empty())
    {
        uchar* m = stack.back();
        stack.pop_back();

        if (!m[-mapstep-1]) CANNY_PUSH((m-mapstep-1), stack);
        if (!m[-mapstep])   CANNY_PUSH((m-mapstep), stack);
        if (!m[-mapstep+1]) CANNY_PUSH((m-mapstep+1), stack);
        if (!m[-1])         CANNY_PUSH((m-1), stack);
        if (!m[1])          CANNY_PUSH((m+1), stack);
        if (!m[mapstep-1])  CANNY_PUSH((m+mapstep-1), stack);
        if (!m[mapstep])    CANNY_PUSH((m+mapstep), stack);
        if (!m[mapstep+1])  CANNY_PUSH((m+mapstep+1), stack);
    }
```

### Candidate 2

- file_path: modules/imgproc/src/corner.cpp
- snippet_url: https://github.com/opencv/opencv/blob/5.x/modules/imgproc/src/corner.cpp#L158-L213
- reasoning: This closed-form eigen-decomposition of the 2x2 structure tensor is what powers Shi-Tomasi/min-eigenvalue corner detection (cornerMinEigenVal, goodFeaturesToTrack), showing a numerically careful analytic solve instead of an iterative eigensolver.

```cpp
static void eigen2x2( const float* cov, float* dst, int n )
{
    for( int j = 0; j < n; j++ )
    {
        double a = cov[j*3];
        double b = cov[j*3+1];
        double c = cov[j*3+2];

        double u = (a + c)*0.5;
        double v = std::sqrt((a - c)*(a - c)*0.25 + b*b);
        double l1 = u + v;
        double l2 = u - v;

        double x = b;
        double y = l1 - a;
        double e = fabs(x);

        if( e + fabs(y) < 1e-4 )
        {
            y = b;
            x = l1 - c;
            e = fabs(x);
            if( e + fabs(y) < 1e-4 )
            {
                e = 1./(e + fabs(y) + FLT_EPSILON);
                x *= e, y *= e;
            }
        }

        double d = 1./std::sqrt(x*x + y*y + DBL_EPSILON);
        dst[6*j] = (float)l1;
        dst[6*j + 2] = (float)(x*d);
        dst[6*j + 3] = (float)(y*d);

        x = b;
        y = l2 - a;
        e = fabs(x);

        if( e + fabs(y) < 1e-4 )
        {
            y = b;
            x = l2 - c;
            e = fabs(x);
            if( e + fabs(y) < 1e-4 )
            {
                e = 1./(e + fabs(y) + FLT_EPSILON);
                x *= e, y *= e;
            }
        }

        d = 1./std::sqrt(x*x + y*y + DBL_EPSILON);
        dst[6*j + 1] = (float)l2;
        dst[6*j + 4] = (float)(x*d);
        dst[6*j + 5] = (float)(y*d);
    }
}
```

### Candidate 3 (least important)

- file_path: modules/imgproc/src/colormap.cpp
- snippet_url: https://github.com/opencv/opencv/blob/5.x/modules/imgproc/src/colormap.cpp#L74-L109
- reasoning: A tidy binary-search-plus-linear-interpolation routine that OpenCV uses to expand a colormap's sparse control points (e.g. JET, HOT) into a full 256-entry lookup table, a nice small algorithm in a supporting utility rather than a core vision routine.

```cpp
template <typename _Tp> static
Mat interp1_(const Mat& X_, const Mat& Y_, const Mat& XI)
{
    int n = XI.rows;
    // sort input table
    std::vector<int> sort_indices = argsort(X_);

    Mat X = sortMatrixRowsByIndices(X_,sort_indices);
    Mat Y = sortMatrixRowsByIndices(Y_,sort_indices);
    // interpolated values
    Mat yi = Mat::zeros(XI.size(), XI.type());
    for(int i = 0; i < n; i++) {
        int low = 0;
        int high = X.rows - 1;
        // set bounds
        if(XI.at<_Tp>(i,0) < X.at<_Tp>(low, 0))
            high = 1;
        if(XI.at<_Tp>(i,0) > X.at<_Tp>(high, 0))
            low = high - 1;
        // binary search
        while((high-low)>1) {
            const int c = low + ((high - low) >> 1);
            if(XI.at<_Tp>(i,0) > X.at<_Tp>(c,0)) {
                low = c;
            } else {
                high = c;
            }
        }
        // linear interpolation
        yi.at<_Tp>(i,0) += Y.at<_Tp>(low,0)
        + (XI.at<_Tp>(i,0) - X.at<_Tp>(low,0))
        * (Y.at<_Tp>(high,0) - Y.at<_Tp>(low,0))
        / (X.at<_Tp>(high,0) - X.at<_Tp>(low,0));
    }
    return yi;
}
```
