from pathlib import Path

script_path = Path(__file__).with_name('apply-qa-priority-fixes.py')
source = script_path.read_text(encoding='utf-8')

needle = "text = replace_once(text, old_emp_validation, new_emp_validation, 'EmployeePortal create-service WA guard')"
replacement = """if old_emp_validation in text:
    text = replace_once(text, old_emp_validation, new_emp_validation, 'EmployeePortal create-service WA guard')
else:
    fallback_marker = \"\"\"      setServiceWizardStep(1);\n      setServiceWizardError('Masukkan nomor WhatsApp yang valid, misalnya 0812xxxxxxx.');\n      return;\n    }\n\"\"\"
    guard_suffix = new_emp_validation[len(old_emp_validation):]
    text = replace_once(text, fallback_marker, fallback_marker + guard_suffix, 'EmployeePortal create-service WA guard fallback')"""

if needle not in source:
    raise RuntimeError('Could not locate EmployeePortal validation patch statement.')

source = source.replace(needle, replacement, 1)
exec(compile(source, str(script_path), 'exec'), {'__name__': '__main__', '__file__': str(script_path)})
