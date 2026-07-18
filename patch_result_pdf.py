import re

with open("src/components/ResultDashboard.tsx", "r") as f:
    content = f.read()

old_handler = """  const handleDownloadPdf = async () => {
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
  };"""

new_handler = """  const handleDownloadPdf = async () => {
    const element = document.getElementById('pdf-content');
    if (!element) return;
    
    // Save original styles
    const originalHeight = element.style.height;
    const originalOverflow = element.style.overflow;
    const originalWidth = element.style.width;
    const originalMaxWidth = element.style.maxWidth;
    
    // Force a specific wide width for PDF generation to ensure it looks good (desktop view)
    element.style.height = 'auto';
    element.style.overflow = 'visible';
    element.style.width = '1000px';
    element.style.maxWidth = '1000px';
    
    // We need a small delay to let the browser re-render the layout
    await new Promise(resolve => setTimeout(resolve, 100));
    
    try {
      const dataUrl = await toPng(element, { 
        quality: 1, 
        backgroundColor: '#FDFDFF',
        pixelRatio: 2,
        width: 1000,
        height: element.scrollHeight,
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left',
          width: '1000px'
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
        position -= pageHeight;
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
      element.style.width = originalWidth;
      element.style.maxWidth = originalMaxWidth;
    }
  };"""

content = content.replace(old_handler, new_handler)

with open("src/components/ResultDashboard.tsx", "w") as f:
    f.write(content)

