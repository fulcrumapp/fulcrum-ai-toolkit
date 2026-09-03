# Public AI Capability Boundaries

Reopen the linked source before presenting availability, limits, beta status,
privacy behavior, or plan eligibility as current.

| Capability | Publicly documented boundary | Source |
| --- | --- | --- |
| Audio FastFill | Voice-assisted form entry; the current guide documents connectivity, app-design, privacy, device, and plan considerations. | [Audio FastFill](https://help.fulcrumapp.com/en/articles/10074106-audio-fastfill) |
| Insights | Natural-language analysis of authorized record data; the current guide labels the capability beta and documents data scope, permissions, and limitations. | [Insights (BETA)](https://help.fulcrumapp.com/en/articles/11586112-insights-beta) |
| Mobile face distortion | Applies to faces detected during supported in-app photo capture; gallery uploads do not pass through that capture-time detection. | [Mobile face distortion](https://help.fulcrumapp.com/en/articles/4806048-mobile-face-distortion-for-photos) |
| Custom on-device inference | `INFERENCE()` is documented for mobile, not the web record editor; model type, device resources, reference files, and beta caveats must match the current function reference. | [`INFERENCE()`](https://docs.fulcrumapp.com/docs/data-events-inference) |

> Source: Each row is materially summarized from its linked public Fulcrum documentation; [Fulcrum pricing](https://www.fulcrumapp.com/pricing/) remains
> the authority for current plan availability.

Do not turn beta access instructions into a timeless support matrix. Do not
publish roadmap claims. For implementation of `INFERENCE()`, route to
[`fulcrum-data-events`](../../fulcrum-data-events/SKILL.md).

## References

- [Fulcrum AI](https://www.fulcrumapp.com/ai-field-data-collection/)
- [Fulcrum pricing](https://www.fulcrumapp.com/pricing/)
- [Fulcrum Data Events reference](https://docs.fulcrumapp.com/docs/data-events-reference)
