import re

with open("src/components/ResultDashboard.tsx", "r") as f:
    result_content = f.read()

result_handler_regex = r"const handleDownloadPdf = async \(\) => \{.*?\n  \};\n"

new_result_handler = """const handleDownloadPdf = async () => {
    const element = document.getElementById('pdf-content');
    if (!element) return;
    
    // Temporarily fix height for capturing
    const originalHeight = element.style.height;
    const originalOverflow = element.style.overflow;
    element.style.height = 'auto';
    element.style.overflow = 'visible';
    
    try {
      const dataUrl = await toPng(element, { 
        quality: 1, 
        backgroundColor: '#FDFDFF',
        pixelRatio: 2,
        width: 1200,
        style: {
          width: '1200px'
        },
        filter: (node) => {
          if (node.classList && node.classList.contains('print:hidden')) {
            return false;
          }
          return true;
        }
      });
      
      const pdf = new jsPDF({
        orientation: 'p',
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
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(dataUrl, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      pdf.save(`ผลการทดสอบ_${student.firstName}_${student.lastName}.pdf`);
    } catch (err) {
      console.error('Error generating PDF', err);
      alert('เกิดข้อผิดพลาดในการสร้าง PDF');
    } finally {
      element.style.height = originalHeight;
      element.style.overflow = originalOverflow;
    }
  };
"""

result_content = re.sub(result_handler_regex, new_result_handler, result_content, flags=re.DOTALL)

with open("src/components/ResultDashboard.tsx", "w") as f:
    f.write(result_content)


with open("src/components/TeacherDashboard.tsx", "r") as f:
    teacher_content = f.read()

teacher_handler_regex = r"const handleDownloadPdf = async \(\) => \{.*?\n  \};\n"

new_teacher_handler = """const handleDownloadPdf = async () => {
    const element = document.getElementById('pdf-teacher-content');
    if (!element) return;
    
    const originalHeight = element.style.height;
    const originalOverflow = element.style.overflow;
    element.style.height = 'auto';
    element.style.overflow = 'visible';
    
    try {
      const dataUrl = await toPng(element, { 
        quality: 1, 
        backgroundColor: '#F8FAFC', // slate-50
        pixelRatio: 2,
        width: 1200,
        style: {
          width: '1200px'
        },
        filter: (node) => {
          if (node.classList && node.classList.contains('print:hidden')) {
            return false;
          }
          return true;
        }
      });
      
      const pdf = new jsPDF({
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
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(dataUrl, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      pdf.save(`รายงานสรุป_${Date.now()}.pdf`);
    } catch (err) {
      console.error('Error generating PDF', err);
      alert('เกิดข้อผิดพลาดในการสร้าง PDF');
    } finally {
      element.style.height = originalHeight;
      element.style.overflow = originalOverflow;
    }
  };
"""

teacher_content = re.sub(teacher_handler_regex, new_teacher_handler, teacher_content, flags=re.DOTALL)

with open("src/components/TeacherDashboard.tsx", "w") as f:
    f.write(teacher_content)

