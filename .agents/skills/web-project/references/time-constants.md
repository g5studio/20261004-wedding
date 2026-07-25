# Time Constants

All time-related values must come from the project's shared time constants module.

Default path: `src/shared/constants/time.constants.ts`. Adjust to match your project layout.

Do not write raw numbers for millisecond, second, minute, hour, day, timeout, delay, interval, TTL, retry wait, rate-limit wait, or retention window logic.

```ts
// Forbidden
createHttpClient({ timeout: 30000 });
setTimeout(run, 3000);

// Required
createHttpClient({ timeout: httpClientDefaultTimeoutMs });
setTimeout(run, 3 * oneSecondToMilliseconds);
```

When a new reusable time value is needed, add a named constant to the time constants module first, then import it at the call site. The constant name must describe the domain purpose, not only the raw value.
