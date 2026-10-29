// Test fixture only: in-memory settings, no extension APIs or external requests.
(() => {
  const listeners = [];
  const params = new URLSearchParams(location.search);
  const settings = { ...XEtaxConfig.defaults };
  for (const key of Object.keys(settings)) if (params.has(key)) settings[key] = XEtaxConfig.normalize(key, typeof settings[key] === 'boolean' ? params.get(key) === 'true' : params.get(key));
  globalThis.chrome = { storage: {
    local: {
      get: async defaults => ({ ...defaults, ...settings }),
      set: async values => {
        const changes = {};
        for (const [key, value] of Object.entries(values)) { changes[key] = { oldValue: settings[key], newValue: value }; settings[key] = value; }
        listeners.forEach(listener => listener(changes, 'local'));
      }
    },
    onChanged: { addListener: listener => listeners.push(listener) }
  } };
})();
