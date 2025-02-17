console.log('Popup script starting...');
console.log('TWITTER_MODS:', typeof TWITTER_MODS !== 'undefined' ? TWITTER_MODS : 'Not loaded');

document.addEventListener('DOMContentLoaded', async () => {
  console.log('DOM Content Loaded');
  const settingsDiv = document.getElementById('settings');
  console.log('Settings div:', settingsDiv);
  
  try {
    const { settings } = await browser.storage.local.get('settings');
    console.log('Retrieved settings:', settings);

    // Section order and titles
    const sections = [
      { id: 'buttonColors', title: 'Button Colors' },
      { id: 'replaceElements', title: 'UI Elements' },
      { id: 'styleFixes', title: 'Style Fixes' },
      { id: 'hideElements', title: 'Hide Elements' }
    ];

    console.log('Creating sections...');
    // Create sections in order
    sections.forEach(({ id, title }) => {
      console.log(`Processing section: ${id}`);
      if (TWITTER_MODS[id]) {
        const sectionDiv = document.createElement('div');
        
        // Add section title
        const titleDiv = document.createElement('div');
        titleDiv.className = 'section-title';
        titleDiv.textContent = title;
        sectionDiv.appendChild(titleDiv);

        // Add section content
        const contentDiv = document.createElement('div');
        contentDiv.className = 'mod-section';

        // Add toggles for each sub-setting
        Object.entries(TWITTER_MODS[id]).forEach(([key, config]) => {
          if (typeof config === 'object' && 'enabled' in config) {
            const item = createToggle(
              `${id}-${key}`,
              config.description,
              settings?.[id]?.[key]?.enabled ?? config.enabled,
              (checked) => updateSetting(id, key, checked)
            );
            contentDiv.appendChild(item);
          }
        });

        sectionDiv.appendChild(contentDiv);
        settingsDiv.appendChild(sectionDiv);
      } else {
        console.log(`Section ${id} not found in TWITTER_MODS`);
      }
    });
  } catch (error) {
    console.error('Error in popup initialization:', error);
  }
});

function createToggle(id, label, checked, onChange) {
  console.log(`Creating toggle: ${id}, ${label}, ${checked}`);
  const div = document.createElement('div');
  div.className = 'mod-item';
  
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.id = id;
  checkbox.checked = checked;
  checkbox.addEventListener('change', (e) => onChange(e.target.checked));

  const labelElement = document.createElement('label');
  labelElement.htmlFor = id;
  labelElement.textContent = label;

  div.appendChild(checkbox);
  div.appendChild(labelElement);
  return div;
}

async function updateSetting(modType, key, value) {
  try {
    console.log(`Updating setting: ${modType}.${key} = ${value}`);
    const { settings = {} } = await browser.storage.local.get('settings');
    
    if (!settings[modType]) settings[modType] = {};
    if (!settings[modType][key]) settings[modType][key] = {};
    settings[modType][key].enabled = value;
    
    console.log('New settings:', settings);
    await browser.storage.local.set({ settings });
    
    // Notify content script to refresh
    const tabs = await browser.tabs.query({ url: ['*://twitter.com/*', '*://x.com/*'] });
    console.log('Found tabs to update:', tabs);
    
    const updatePromises = tabs.map(tab => 
      browser.tabs.sendMessage(tab.id, { 
        type: 'refreshTheme',
        modType,
        key,
        value
      }).catch(err => console.error(`Failed to update tab ${tab.id}:`, err))
    );
    
    await Promise.all(updatePromises);
    
    // Visual feedback
    const checkbox = document.getElementById(`${modType}-${key}`);
    if (checkbox) {
      checkbox.classList.add('updated');
      setTimeout(() => checkbox.classList.remove('updated'), 500);
    }
  } catch (error) {
    console.error('Failed to update setting:', error);
    alert('Failed to update setting. Check console for details.');
  }
} 