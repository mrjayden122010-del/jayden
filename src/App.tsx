import { ChangeEvent, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  Alert,
  AppBar,
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  TextField,
  Toolbar,
  Typography,
} from "@mui/material";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";

type UploadResult = {
  storageId: Id<"_storage">;
};

export default function App() {
  const images = useQuery(api.gallery.listImages);
  const generateUploadUrl = useMutation(api.gallery.generateUploadUrl);
  const createImageEntry = useMutation(api.gallery.createImageEntry);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const isFormValid = title.trim() !== "" && caption.trim() !== "" && selectedFile;
  const imageCount = images?.length ?? 0;
  const helperText = useMemo(() => {
    if (selectedFile) {
      return `Selected image: ${selectedFile.name}`;
    }

    return "Choose an image file to add to the gallery.";
  }, [selectedFile]);

  const resetForm = () => {
    setTitle("");
    setCaption("");
    setSelectedFile(null);
    setErrorMessage("");
    setIsSubmitting(false);
  };

  const handleClose = () => {
    if (isSubmitting) {
      return;
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
  };

  const handleSubmit = async () => {
    if (!selectedFile) {
      setErrorMessage("Please choose an image before uploading.");
      return;
    }

    if (!title.trim() || !caption.trim()) {
      setErrorMessage("Please add both a title and a caption.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const uploadUrl = await generateUploadUrl({});
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          "Content-Type": selectedFile.type || "application/octet-stream",
        },
        body: selectedFile,
      });

      if (!uploadResponse.ok) {
        throw new Error("Image upload failed.");
      }

      const { storageId } = (await uploadResponse.json()) as UploadResult;

      await createImageEntry({
        storageId,
        title,
        caption,
      });

      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong while uploading the image.",
      );
      setIsSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at 12% 18%, rgba(255,181,213,0.6), transparent 0 26%), radial-gradient(circle at 88% 12%, rgba(255,92,160,0.24), transparent 0 24%), linear-gradient(180deg, #ffdce9 0%, #fff4f8 34%, #ffd6e6 100%)",
        position: "relative",
        overflow: "hidden",
        "&::before": {
          content: '""',
          position: "absolute",
          inset: "4% auto auto -10%",
          width: 320,
          height: 320,
          borderRadius: "48% 52% 61% 39% / 35% 46% 54% 65%",
          background:
            "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.7), rgba(255,126,186,0.22) 52%, rgba(255,126,186,0) 70%)",
          filter: "blur(6px)",
          pointerEvents: "none",
        },
        "&::after": {
          content: '""',
          position: "absolute",
          right: "-6%",
          bottom: "12%",
          width: 260,
          height: 260,
          borderRadius: "50%",
          border: "1px solid rgba(255,255,255,0.34)",
          boxShadow: "0 0 0 22px rgba(255,255,255,0.12)",
          pointerEvents: "none",
        },
      }}
    >
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          backgroundColor: "rgba(255, 246, 250, 0.72)",
          color: "text.primary",
          backdropFilter: "blur(18px)",
          borderBottom: "1px solid rgba(186, 73, 126, 0.14)",
        }}
      >
        <Toolbar sx={{ gap: 2, justifyContent: "space-between" }}>
          <Box>
            <Typography variant="h6" sx={{ letterSpacing: "-0.03em", fontWeight: 700 }}>
              Jayden Gallery
            </Typography>
            <Typography variant="body2" color="text.secondary">
              A sugar-blush archive for your brightest frames.
            </Typography>
          </Box>
          <Button
            variant="contained"
            color="primary"
            onClick={() => setIsDialogOpen(true)}
            sx={{
              px: 3.2,
              py: 1.3,
              background:
                "linear-gradient(135deg, rgba(242,75,154,1), rgba(255,136,190,1))",
              boxShadow: "0 16px 34px rgba(203, 46, 120, 0.28)",
              "&:hover": {
                boxShadow: "0 20px 40px rgba(203, 46, 120, 0.34)",
              },
            }}
          >
            Upload Image
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 8 } }}>
        <Stack spacing={4}>
          <Paper
            elevation={0}
            sx={{
              p: { xs: 3, md: 5 },
              border: "1px solid rgba(188, 88, 138, 0.18)",
              background:
                "linear-gradient(145deg, rgba(255,255,255,0.8), rgba(255,228,239,0.88))",
              boxShadow:
                "0 24px 60px rgba(168, 39, 95, 0.12), inset 0 0 0 1px rgba(255,255,255,0.58)",
              backdropFilter: "blur(18px)",
              position: "relative",
              overflow: "hidden",
              "&::after": {
                content: '""',
                position: "absolute",
                top: -40,
                right: -20,
                width: 180,
                height: 180,
                borderRadius: "50%",
                background:
                  "radial-gradient(circle, rgba(255,255,255,0.75), rgba(255,255,255,0) 70%)",
              },
            }}
          >
            <Stack spacing={2.5} sx={{ position: "relative", zIndex: 1 }}>
              <Typography
                variant="overline"
                sx={{ color: "primary.dark", letterSpacing: "0.24em", fontWeight: 800 }}
              >
                Cotton Candy Archive
              </Typography>
              <Typography variant="h2" sx={{ fontSize: { xs: "2.8rem", md: "4.6rem" }, maxWidth: 920 }}>
                Every image lands inside a dreamy pink gallery with instant live updates.
              </Typography>
              <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 760, lineHeight: 1.65 }}>
                Upload portraits, moods, details, and tiny stories into a soft-focus collection
                built on Convex. The whole experience now leans editorial, glossy, and unmistakably pink.
              </Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ pt: 1, flexWrap: "wrap" }}>
                <Box
                  sx={{
                    px: 2,
                    py: 1,
                    borderRadius: 0,
                    bgcolor: "rgba(242,75,154,0.12)",
                    color: "primary.dark",
                    fontWeight: 700,
                    width: "fit-content",
                  }}
                >
                  Powder-pink redesign
                </Box>
                <Box
                  sx={{
                    px: 2,
                    py: 1,
                    borderRadius: 0,
                    bgcolor: "rgba(255,255,255,0.6)",
                    color: "text.primary",
                    fontWeight: 700,
                    width: "fit-content",
                  }}
                >
                  Proper framed upload modal
                </Box>
                <Box
                  sx={{
                    px: 2,
                    py: 1,
                    borderRadius: 0,
                    bgcolor: "rgba(255,195,219,0.7)",
                    color: "primary.dark",
                    fontWeight: 700,
                    width: "fit-content",
                  }}
                >
                  {imageCount} live {imageCount === 1 ? "image" : "images"}
                </Box>
              </Stack>
            </Stack>
          </Paper>

          {images === undefined ? (
            <Stack spacing={2} sx={{ py: 10, alignItems: "center" }}>
              <CircularProgress color="primary" />
              <Typography color="text.secondary">
                Loading your gallery...
              </Typography>
            </Stack>
          ) : images.length === 0 ? (
            <Paper
              elevation={0}
              sx={{
                p: 6,
                textAlign: "center",
                borderStyle: "dashed",
                borderWidth: 1.5,
                borderColor: "rgba(200, 83, 136, 0.32)",
                backgroundColor: "rgba(255, 248, 252, 0.82)",
                boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.5)",
              }}
            >
              <Typography variant="h4" gutterBottom>
                Your pink gallery is ready.
              </Typography>
              <Typography color="text.secondary">
                Use the upload button at the top to add the first image with a
                title and caption.
              </Typography>
            </Paper>
          ) : (
            <Box
              sx={{
                display: "grid",
                gap: 3,
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "repeat(2, minmax(0, 1fr))",
                  lg: "repeat(3, minmax(0, 1fr))",
                },
              }}
            >
              {images.map((image) => (
                <Card
                  key={image._id}
                  elevation={0}
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                    border: "1px solid rgba(186, 73, 126, 0.18)",
                    background:
                      "linear-gradient(180deg, rgba(255,255,255,0.84), rgba(255,239,246,0.92))",
                    boxShadow: "0 20px 42px rgba(168, 39, 95, 0.12)",
                    borderRadius: 0,
                    transition:
                      "transform 220ms ease, box-shadow 220ms ease, border-color 220ms ease",
                    "&:hover": {
                      transform: "translateY(-6px) rotate(-0.5deg)",
                      boxShadow: "0 24px 56px rgba(168, 39, 95, 0.18)",
                      borderColor: "rgba(242,75,154,0.34)",
                    },
                  }}
                >
                  {image.imageUrl ? (
                    <CardMedia
                      component="img"
                      image={image.imageUrl}
                      alt={image.title}
                      sx={{ height: 260, objectFit: "cover" }}
                    />
                  ) : (
                    <Box
                      sx={{
                        height: 260,
                        display: "grid",
                        placeItems: "center",
                        bgcolor: "rgba(242,75,154,0.08)",
                      }}
                    >
                      <Typography color="text.secondary">
                        Image unavailable
                      </Typography>
                    </Box>
                  )}
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Stack spacing={1.5}>
                      <Typography variant="h5">{image.title}</Typography>
                      <Typography variant="body1" color="text.secondary">
                        {image.caption}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Intl.DateTimeFormat("en-US", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(new Date(image._creationTime))}
                      </Typography>
                      <Box
                        sx={{
                          width: 56,
                          height: 5,
                          borderRadius: 0,
                          background:
                            "linear-gradient(90deg, rgba(242,75,154,1), rgba(255,186,214,1))",
                        }}
                      />
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}
        </Stack>
      </Container>

      <Dialog
        open={isDialogOpen}
        onClose={handleClose}
        fullWidth
        maxWidth="sm"
        slotProps={{
          paper: {
            sx: {
              borderRadius: 0,
              backgroundImage:
                "linear-gradient(180deg, rgba(255,250,252,0.98), rgba(255,234,244,0.96))",
              border: "1.5px solid rgba(190, 74, 127, 0.26)",
              overflow: "hidden",
              position: "relative",
              "&::before": {
                content: '""',
                position: "absolute",
                inset: 10,
                borderRadius: 0,
                border: "1px solid rgba(255,255,255,0.6)",
                pointerEvents: "none",
              },
            },
          },
          backdrop: {
            sx: {
              backgroundColor: "rgba(133, 18, 70, 0.22)",
              backdropFilter: "blur(10px)",
            },
          },
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h4">Upload an image</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
            Add a new frame to the pink archive with a title and a short caption.
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
            <Button
              variant="outlined"
              component="label"
              sx={{
                alignSelf: "flex-start",
                borderColor: "rgba(190, 74, 127, 0.24)",
                backgroundColor: "rgba(255,255,255,0.55)",
              }}
            >
              Choose Image
              <input
                hidden
                accept="image/*"
                type="file"
                onChange={handleFileChange}
              />
            </Button>
            <Typography variant="body2" color="text.secondary">
              {helperText}
            </Typography>
            <TextField
              label="Title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              fullWidth
              required
            />
            <TextField
              label="Caption"
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              multiline
              minRows={4}
              fullWidth
              required
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={!isFormValid || isSubmitting}
            sx={{
              background:
                "linear-gradient(135deg, rgba(242,75,154,1), rgba(255,136,190,1))",
            }}
            onClick={() => {
              void handleSubmit();
            }}
          >
            {isSubmitting ? "Uploading..." : "Publish to Gallery"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
