from pathlib import Path

source_path = Path('scripts/apply-service-flow-fix.py')
source = source_path.read_text(encoding='utf-8')
source = source.replace('old = """', 'old = r"""')
source = source.replace('new = """', 'new = r"""')
source = source.replace('admin_modal = """', 'admin_modal = r"""')
exec(compile(source, str(source_path), 'exec'))
