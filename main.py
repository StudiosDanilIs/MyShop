import tkinter as tk
from Programa import Myshop

if __name__ == "__main__":
    root = tk.Tk()
    logo = "imagenes\\logo.ico"
    root.iconbitmap(True, logo)

    Myshop(root)
    root.mainloop()