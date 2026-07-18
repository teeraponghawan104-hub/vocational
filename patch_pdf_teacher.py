import re

def fix_pdf(filepath):
    with open(filepath, "r") as f:
        content = f.read()

    # Find the pdf generation block
    old_block = """      const pdf = new jsPDF({
        orientation: 'l',
        unit: 'px',
        format: 'a4'
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      const imgProps = pdf.getImageProperties(dataUrl);
      const imgRatio = imgProps.width / imgProps.height;
      const imgWidth = pdfWidth;
      const imgHeight = pdfWidth / imgRatio;
      
      let heightLeft = imgHeight;
      let position = 0;
      
      pdf.addImage(dataUrl, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      while (heightLeft > 0) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(dataUrl, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      pdf.save(`รายงานสรุป_${Date.now()}.pdf`);"""

    new_block = """      const imgProps = pdf.getImageProperties(dataUrl);
      
      const pdf = new jsPDF({
        orientation: imgProps.width > imgProps.height ? 'l' : 'p',
        unit: 'px',
        format: [imgProps.width, imgProps.height]
      });
      
      pdf.addImage(dataUrl, 'PNG', 0, 0, imgProps.width, imgProps.height);
      
      pdf.save(`รายงานสรุป_${Date.now()}.pdf`);"""

    if old_block in content:
        content = content.replace(old_block, new_block)
        with open(filepath, "w") as f:
            f.write(content)
        print("Updated " + filepath)
    else:
        print("Block not found in " + filepath)

fix_pdf("src/components/TeacherDashboard.tsx")

