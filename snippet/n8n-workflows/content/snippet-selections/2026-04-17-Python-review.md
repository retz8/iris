# Breakdown Review — 2026-04-17 — Python

Issue: #10
Date: 2026-04-17
Language: Python
Status: PENDING_APPROVAL

## Repo 1 — shiyu-coder/Kronos

- file_path: model/module.py
- snippet_url: https://github.com/shiyu-coder/Kronos/blob/master/model/module.py

file_intent: Hierarchical two-scale token embedder
breakdown_what: Splits each integer token ID into coarse (high-bits) and fine (low-bits) parts using bitmasking, independently embeds both halves, and fuses them through a linear projection into a single d_model vector.
breakdown_responsibility: Acts as the Kronos transformer's input layer, converting discretized candlestick K-line tokens into dense representations; the two-scale split lets the model separately learn broad price-range structure from S1 and fine intra-bucket tick movement from S2.
breakdown_clever: A 16-bit token split into two 8-bit halves needs only 512 embedding rows instead of 65,536: the table size scales as 2^s1 + 2^s2, not 2^(s1+s2), and the fusion projection reconstructs the full-rank representation at inference.
project_context: Kronos is a foundation model for financial markets pre-trained on 12 billion K-line records from 45 global exchanges, accepted at AAAI 2026. Quant researchers use it as a base for downstream tasks like price forecasting, volatility estimation, and synthetic K-line generation.

### Reformatted Snippet

```python
class HierarchicalEmbedding(nn.Module):
    def __init__(self, s1_bits, s2_bits, d_model=256):
        super().__init__()
        self.s1_bits = s1_bits
        self.s2_bits = s2_bits

        vocab_s1 = 2 ** s1_bits
        vocab_s2 = 2 ** s2_bits

        self.emb_s1 = nn.Embedding(vocab_s1, d_model)
        self.emb_s2 = nn.Embedding(vocab_s2, d_model)
        self.d_model = d_model
        self.fusion_proj = nn.Linear(d_model * 2, d_model)

        nn.init.normal_(
            self.emb_s1.weight, mean=0, std=d_model ** -0.5
        )
        nn.init.normal_(
            self.emb_s2.weight, mean=0, std=d_model ** -0.5
        )

    def split_token(self, token_ids: torch.Tensor, s2_bits: int):
        assert isinstance(s2_bits, int) and s2_bits > 0
        t = token_ids.long()
        mask = (1 << s2_bits) - 1
        s2_ids = t & mask        # extract low bits
        s1_ids = t >> s2_bits    # extract high bits
        return s1_ids, s2_ids

    def forward(self, token_ids):
        if isinstance(token_ids, (tuple, list)):
            s1_ids, s2_ids = token_ids
        else:
            s1_ids, s2_ids = self.split_token(
                token_ids, self.s2_bits
            )
        s1_emb = self.emb_s1(s1_ids) * math.sqrt(self.d_model)
        s2_emb = self.emb_s2(s2_ids) * math.sqrt(self.d_model)
        return self.fusion_proj(
            torch.cat([s1_emb, s2_emb], dim=-1)
        )
```

## Repo 2 — microsoft/markitdown

- file_path: packages/markitdown/src/markitdown/converter_utils/docx/math/omml.py
- snippet_url: https://github.com/microsoft/markitdown/blob/main/packages/markitdown/src/markitdown/converter_utils/docx/math/omml.py

file_intent: OMML math element handlers and dispatch table
breakdown_what: Converts OOXML math elements — n-ary operators like summations and integrals, plus raw text runs — into LaTeX strings, and wires up the tag-to-method dispatch table that routes every supported math element type to its handler.
breakdown_responsibility: Central to markitdown's Word (.docx) math equation pipeline: the `tag2meth` dispatch table is the switch that lets a single tree-walk function process any OMML node type and emit the corresponding LaTeX fragment for Markdown output.
breakdown_clever: `findtext` returns a plain string, so iterating over it in `do_r` yields individual Unicode codepoints — `_t_dict` is a per-character map that converts math symbols like Σ or ∞ to LaTeX equivalents, with unmapped characters passing through unchanged.
project_context: markitdown is a Microsoft open-source Python library that converts Office documents, PDFs, and web content into Markdown for LLM pipelines and RAG preprocessing. Developers integrate it into agentic workflows via its CLI, Python API, or MCP server.

### Reformatted Snippet

```python
def do_nary(self, elm):
    """
    the n-ary object
    """
    res = []
    bo = ""
    for stag, t, e in self.process_children_list(elm):
        if stag == "naryPr":
            bo = get_val(t.chr, store=CHR_BO)
        else:
            res.append(t)
    return bo + BLANK.join(res)

def do_r(self, elm):
    """
    Get text from 'r' element, and try convert
    them to latex symbols
    """
    _str = []
    for s in elm.findtext(
        "./{0}t".format(OMML_NS)
    ):
        _str.append(self._t_dict.get(s, s))
    return escape_latex(BLANK.join(_str))

tag2meth = {
    "acc": do_acc,
    "r": do_r,
    "bar": do_bar,
    "sub": do_sub,
    "sup": do_sup,
    "f": do_f,
    "func": do_func,
    "fName": do_fname,
    "groupChr": do_groupchr,
    "d": do_d,
    "rad": do_rad,
    "eqArr": do_eqarr,
    "limLow": do_limlow,
    "limUpp": do_limupp,
    "lim": do_lim,
    "m": do_m,
    "mr": do_mr,
    "nary": do_nary,
}
```
