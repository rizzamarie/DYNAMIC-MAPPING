const fs = require('fs');
const path = 'c:\\Users\\Public\\OneDrive\\Documents\\DYNAMIC MAPPING\\client\\src\\CustomerKiosk.jsx';
let content = fs.readFileSync(path, 'utf8');

// The issue is likely too many or too few closing divs between the map and the sidebar.
// Let's identify the map end and the sidebar start.

const mapEndPattern = /\{productLocation && kioskLocation && \([\s\S]*?YOU ARE HERE<\/div>\s*<\/div>\s*?\)\}\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/;
const sidebarStart = '{/* Right Side Shopping Panel */}';

if (mapEndPattern.test(content)) {
    console.log('Found map end pattern');
    // We want to make sure there are exactly FOUR closing divs after the markers conditional.
    // Wait, let's look at the markers conditional again.
    // {productLocation && kioskLocation && ( <div ...>...</div> )}
    // This div is CLOSED inside the conditional.
    // Then we close:
    // 1. Markers Layer
    // 2. Map Canvas
    // 3. Map Area
    // 4. Map Content Area
    
    // Let's replace the whole messy middle section.
    const newMiddle = `                  {productLocation && kioskLocation && (
                    <div style={{ position: 'absolute', left: kioskLocation.x, top: kioskLocation.y, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 4000 }}>
                      <div style={{ position: 'absolute', top: 0, left: 0, width: pixelsPerUnit * 1.5, height: pixelsPerUnit * 1.5, border: \`4px solid \${theme.colors.primary}\`, borderRadius: '50%', transform: 'translate(-50%, -50%)', animation: 'pulse-ring 2s infinite', pointerEvents: 'none' }} />
                      <div style={{ backgroundColor: theme.colors.primary, color: '#ffffff', padding: '6px 16px', borderRadius: '10px', fontSize: '14px', fontWeight: '900', whiteSpace: 'nowrap', boxShadow: \`0 6px 15px \${theme.colors.primary}73\`, animation: 'pulse 1.5s infinite', border: '2px solid #ffffff', transform: 'translateY(-50%)' }}>YOU ARE HERE</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Side Shopping Panel */}
          <div className="side-panel">`;

    // We need to find the start of the markers conditional and the start of the side panel.
    const markersStart = content.indexOf('{productLocation && kioskLocation && (');
    const sidePanelStart = content.indexOf('<div className="side-panel">');
    
    if (markersStart !== -1 && sidePanelStart !== -1) {
        const before = content.substring(0, markersStart);
        const after = content.substring(sidePanelStart + '<div className="side-panel">'.length);
        content = before + newMiddle + after;
        
        // Also check the end of the file for the extra div I added earlier.
        // The end should have exactly 5 closing divs after )}
        const ternaryEnd = content.lastIndexOf(')}');
        if (ternaryEnd !== -1) {
            const endPart = `
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Kiosk;`;
            // Search for the end of the component function.
            const exportMatch = content.indexOf('export default Kiosk;');
            if (exportMatch !== -1) {
                const beforeTernary = content.substring(0, ternaryEnd + 2);
                const stylesPart = content.substring(exportMatch - 1); // Save styles etc.
                // Wait, I don't want to lose the styles.
                const footerStart = content.indexOf('const headerStyle =');
                const beforeFooter = content.substring(0, footerStart);
                const footerContent = content.substring(footerStart);
                
                const finalBody = beforeTernary + `
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

`;
                content = finalBody + footerContent;
            }
        }

        fs.writeFileSync(path, content, 'utf8');
        console.log('File fixed successfully');
    } else {
        console.log('Could not find markers or side panel');
    }
} else {
    console.log('Map end pattern not found');
}
