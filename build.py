import glob, os
shell = open('src/shell.html').read()
js = '\n'.join(open(f).read() for f in sorted(glob.glob('src/js/*.js')))
out = shell.replace('/*__JS__*/', js)
os.makedirs('dist', exist_ok=True)
open('dist/kinetic_city.html', 'w').write(out)
print(len(out), 'bytes,', out.count('\n'), 'lines')
