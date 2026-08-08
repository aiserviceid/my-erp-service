from pathlib import Path

script_path = Path(__file__).with_name('apply-unitpro-ui-polish.py')
source = script_path.read_text(encoding='utf-8')

needle = "text = replace_once(text, actions_old, actions_new, 'AdminDashboard action dropdown')"
replacement = """if actions_old in text:
    text = replace_once(text, actions_old, actions_new, 'AdminDashboard action dropdown')
else:
    table_index = text.find('className=\"service-desktop-table\"')
    cell_start_marker = \"                            <td>\\n                              <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>\"
    cell_end_marker = \"                            </td>\\n                          </tr>\"
    cell_start = text.find(cell_start_marker, table_index)
    cell_end = text.find(cell_end_marker, cell_start)
    if table_index < 0 or cell_start < 0 or cell_end < 0:
        raise RuntimeError('AdminDashboard action dropdown: fallback markers not found')
    replacement_cell = \"                            <td>\\n\" + actions_new + \"\\n                            </td>\\n\"
    text = text[:cell_start] + replacement_cell + text[cell_end + len(\"                            </td>\\n\"):]"""

if needle not in source:
    raise RuntimeError('Patch runner could not locate action-dropdown statement in base patch script.')

source = source.replace(needle, replacement, 1)
exec(compile(source, str(script_path), 'exec'), {'__name__': '__main__', '__file__': str(script_path)})
